ALTER TABLE "holds" ADD COLUMN "guests_per_room" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_guests_check" CHECK ("holds"."guests_per_room" between 1 and 4);--> statement-breakpoint
CREATE OR REPLACE FUNCTION parley_create_hold(
	p_property_id uuid,
	p_visitor_id text,
	p_check_in date,
	p_check_out date,
	p_rooms integer,
	p_guests_per_room integer,
	p_expires_at timestamptz
)
RETURNS TABLE(hold_id uuid, hold_expires_at timestamptz)
LANGUAGE plpgsql
AS $$
DECLARE
	v_total_rooms integer;
	v_required_nights integer;
	v_inventory_nights integer;
	v_min_available integer;
BEGIN
	IF p_rooms < 1 OR p_rooms > 12 OR p_guests_per_room < 1 OR p_guests_per_room > 4 THEN
		RAISE EXCEPTION 'invalid hold quantity';
	END IF;

	v_required_nights := p_check_out - p_check_in;
	IF v_required_nights < 1 OR v_required_nights > 14 THEN
		RAISE EXCEPTION 'invalid hold duration';
	END IF;

	PERFORM pg_advisory_xact_lock(hashtext(p_property_id::text));

	SELECT total_rooms INTO v_total_rooms
	FROM properties
	WHERE id = p_property_id;

	SELECT count(*)::integer,
		min(v_total_rooms - i.rooms_sold - coalesce(active_holds.rooms_held, 0))::integer
	INTO v_inventory_nights, v_min_available
	FROM inventory i
	LEFT JOIN LATERAL (
		SELECT sum(h.rooms)::integer AS rooms_held
		FROM holds h
		WHERE h.property_id = p_property_id
			AND h.status = 'active'
			AND h.expires_at > current_timestamp
			AND h.check_in <= i.stay_date
			AND h.check_out > i.stay_date
	) active_holds ON true
	WHERE i.property_id = p_property_id
		AND i.stay_date >= p_check_in
		AND i.stay_date < p_check_out;

	IF v_inventory_nights <> v_required_nights OR v_min_available < p_rooms THEN
		RETURN;
	END IF;

	RETURN QUERY
	INSERT INTO holds (
		property_id,
		visitor_id,
		check_in,
		check_out,
		rooms,
		guests_per_room,
		expires_at,
		status
	)
	VALUES (
		p_property_id,
		p_visitor_id,
		p_check_in,
		p_check_out,
		p_rooms,
		p_guests_per_room,
		p_expires_at,
		'active'
	)
	RETURNING holds.id, holds.expires_at;
END;
$$;
