// functions/api/index.js

// தரவுகளைச் சிறிய பகுதிகளாகப் பிரிப்பதற்கான உதவி ஃபங்ஷன் (Helper Function)
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

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
  
  // பாதுகாப்பிற்காக 50 வரிகளாகப் பிரிக்கிறோம் (D1 Limit is usually 128)
  const BATCH_SIZE = 50; 

  try {
    if (type === 'locations') {
      await db.prepare("DELETE FROM locations").run();
      const stmt = db.prepare("INSERT INTO locations (id, name, excludedFromSchedule) VALUES (?, ?, ?)");
      
      const chunks = chunkArray(data, BATCH_SIZE);
      for (const chunk of chunks) {
        const batch = chunk.map(l => stmt.bind(l.id, l.name, l.excludedFromSchedule ? 1 : 0));
        if (batch.length > 0) await db.batch(batch);
      }
    } 
    
    // Staff Update (Chunking Added)
    else if (type === 'staff') {
      await db.prepare("DELETE FROM staff").run();
      const stmt = db.prepare("INSERT INTO staff (id, name, locationId, additionalLocationIds, category, meetId, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
      
      const chunks = chunkArray(data, BATCH_SIZE);
      for (const chunk of chunks) {
        const batch = chunk.map(s => stmt.bind(
          s.id, 
          s.name, 
          s.locationId, 
          JSON.stringify(s.additionalLocationIds || []), 
          s.category, 
          s.meetId || null, 
          s.status || null
        ));
        if (batch.length > 0) await db.batch(batch);
      }
    }

    // Topics Update (Chunking Added)
    else if (type === 'topics') {
      await db.prepare("DELETE FROM topics").run();
      const stmt = db.prepare("INSERT INTO topics (id, name) VALUES (?, ?)");
      
      const chunks = chunkArray(data, BATCH_SIZE);
      for (const chunk of chunks) {
        const batch = chunk.map(t => stmt.bind(t.id, t.name));
        if (batch.length > 0) await db.batch(batch);
      }
    }

    // Thirukkurals Update (Chunking Added)
    else if (type === 'thirukurals') {
      await db.prepare("DELETE FROM thirukkurals").run();
      const stmt = db.prepare("INSERT INTO thirukkurals (id, topicId, verse) VALUES (?, ?, ?)");
      
      const chunks = chunkArray(data, BATCH_SIZE);
      for (const chunk of chunks) {
        const batch = chunk.map(t => stmt.bind(t.id, t.topicId, t.verse));
        if (batch.length > 0) await db.batch(batch);
      }
    }

    else if (type === 'sharingConfigs') {
      await db.prepare("DELETE FROM sharing_configs").run();
      const stmt = db.prepare("INSERT INTO sharing_configs (day, locationIds) VALUES (?, ?)");
      // Configs are usually small, but safe to chunk
      const chunks = chunkArray(data, BATCH_SIZE);
      for (const chunk of chunks) {
        const batch = chunk.map(s => stmt.bind(s.day, JSON.stringify(s.locationIds)));
        if (batch.length > 0) await db.batch(batch);
      }
    }

    else if (type === 'postponeddates') {
      await db.prepare("DELETE FROM postponed_dates").run();
      const stmt = db.prepare("INSERT INTO postponed_dates (originalDate, newDate) VALUES (?, ?)");
      const chunks = chunkArray(data, BATCH_SIZE);
      for (const chunk of chunks) {
        const batch = chunk.map(p => stmt.bind(p.originalDate, p.newDate));
        if (batch.length > 0) await db.batch(batch);
      }
    }

    else if (type === 'attendance') {
      // Attendance is sent one by one usually via Frontend, but handling just in case
      const stmt = db.prepare(`
        INSERT INTO attendance (id, date, staffId, unknownName, meetLink, inTime, outTime, percentage) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
        percentage=excluded.percentage, inTime=excluded.inTime, outTime=excluded.outTime
      `);
      // Attendance data here is usually a single object, not array. 
      // If you change frontend to send array later, this needs chunking too.
      // Assuming 'data' is a single object here as per current App code.
      await stmt.bind(data.id, data.date, data.staffId, data.unknownName, data.meetLink, data.inTime, data.outTime, data.percentage).run();
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}