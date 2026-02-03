// functions/api/index.js

export async function onRequestGet(context) {
  const db = context.env.DB;
  try {
    const locations = await db.prepare("SELECT * FROM locations").all();
    const staff = await db.prepare("SELECT * FROM staff").all();
    const topics = await db.prepare("SELECT * FROM topics").all();
    const thirukkurals = await db.prepare("SELECT * FROM thirukkurals").all();
    const attendance = await db.prepare("SELECT * FROM attendance").all();
    const sharing = await db.prepare("SELECT * FROM sharing_configs").all();
    const postponed = await db.prepare("SELECT * FROM postponed_dates").all();

    const formattedStaff = staff.results.map(s => ({
      ...s,
      additionalLocationIds: s.additionalLocationIds ? JSON.parse(s.additionalLocationIds) : []
    }));

    const formattedSharing = sharing.results.map(s => ({
      ...s,
      locationIds: s.locationIds ? JSON.parse(s.locationIds) : []
    }));

    const formattedLocations = locations.results.map(l => ({
        ...l,
        excludedFromSchedule: l.excludedFromSchedule === 1
    }));

    return new Response(JSON.stringify({
      locations: formattedLocations,
      staff: formattedStaff,
      topics: topics.results,
      thirukkurals: thirukkurals.results,
      attendance_records: attendance.results,
      sharing_configs: formattedSharing,
      postponed_dates: postponed.results
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  const { request } = context;
  const { type, data } = await request.json();

  try {
    if (type === 'locations') {
      await db.prepare("DELETE FROM locations").run();
      const stmt = db.prepare("INSERT INTO locations (id, name, excludedFromSchedule) VALUES (?, ?, ?)");
      const batch = data.map(l => stmt.bind(l.id, l.name, l.excludedFromSchedule ? 1 : 0));
      if (batch.length > 0) await db.batch(batch);
    } 
    
    // Staff Update Logic
    else if (type === 'staff') {
      await db.prepare("DELETE FROM staff").run();
      const stmt = db.prepare("INSERT INTO staff (id, name, locationId, additionalLocationIds, category, meetId, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
      // மாற்றம்: additionalLocationIds காலியாக இருந்தால் [] என எடுத்துக்கொள்ளவும்
      const batch = data.map(s => stmt.bind(
        s.id, 
        s.name, 
        s.locationId, 
        JSON.stringify(s.additionalLocationIds || []), 
        s.category, 
        s.meetId, 
        s.status
      ));
      if (batch.length > 0) await db.batch(batch);
    }

    // Topics Update Logic
    else if (type === 'topics') {
      await db.prepare("DELETE FROM topics").run();
      const stmt = db.prepare("INSERT INTO topics (id, name) VALUES (?, ?)");
      const batch = data.map(t => stmt.bind(t.id, t.name));
      if (batch.length > 0) await db.batch(batch);
    }

    // Thirukkurals Update Logic
    // குறிப்பு: Frontend-ல் 'thirukurals' என்று அனுப்பினால், இங்கும் அதையே பயன்படுத்த வேண்டும்.
    else if (type === 'thirukurals') {
      await db.prepare("DELETE FROM thirukkurals").run();
      const stmt = db.prepare("INSERT INTO thirukkurals (id, topicId, verse) VALUES (?, ?, ?)");
      const batch = data.map(t => stmt.bind(t.id, t.topicId, t.verse));
      if (batch.length > 0) await db.batch(batch);
    }

    else if (type === 'sharingConfigs') {
      await db.prepare("DELETE FROM sharing_configs").run();
      const stmt = db.prepare("INSERT INTO sharing_configs (day, locationIds) VALUES (?, ?)");
      const batch = data.map(s => stmt.bind(s.day, JSON.stringify(s.locationIds)));
      if (batch.length > 0) await db.batch(batch);
    }

    else if (type === 'postponeddates') {
      await db.prepare("DELETE FROM postponed_dates").run();
      const stmt = db.prepare("INSERT INTO postponed_dates (originalDate, newDate) VALUES (?, ?)");
      const batch = data.map(p => stmt.bind(p.originalDate, p.newDate));
      if (batch.length > 0) await db.batch(batch);
    }

    else if (type === 'attendance') {
      const stmt = db.prepare(`
        INSERT INTO attendance (id, date, staffId, unknownName, meetLink, inTime, outTime, percentage) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
        percentage=excluded.percentage, inTime=excluded.inTime, outTime=excluded.outTime
      `);
      await stmt.bind(data.id, data.date, data.staffId, data.unknownName, data.meetLink, data.inTime, data.outTime, data.percentage).run();
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}