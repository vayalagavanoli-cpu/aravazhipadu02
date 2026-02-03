// functions/api/index.js

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const safeJsonParse = (str) => {
  try {
    return str ? JSON.parse(str) : [];
  } catch (e) {
    return [];
  }
};

export async function onRequestGet(context) {
  const db = context.env.DB;
  
  const safeFetch = async (query) => {
    try {
      const result = await db.prepare(query).all();
      return result.results || [];
    } catch (e) {
      console.error(`Query failed: ${query}`, e);
      return []; 
    }
  };

  try {
    // 1. SELECT Queries (Table பெயர்கள் சரியாக இருக்க வேண்டும்)
    const locations = await safeFetch("SELECT * FROM locations");
    const staff = await safeFetch("SELECT * FROM staff");
    const topics = await safeFetch("SELECT * FROM topics");
    const thirukkurals = await safeFetch("SELECT * FROM thirukkurals");
    
    // மாற்றம்: டேபிள் பெயர் 'attendance_records' என மாற்றப்பட்டுள்ளது
    const attendance = await safeFetch("SELECT * FROM attendance_records");
    
    const sharing = await safeFetch("SELECT * FROM sharing_configs");
    const postponed = await safeFetch("SELECT * FROM postponed_dates");

    const formattedStaff = staff.map(s => ({
      ...s,
      additionalLocationIds: safeJsonParse(s.additionalLocationIds)
    }));

    const formattedSharing = sharing.map(s => ({
      ...s,
      locationIds: safeJsonParse(s.locationIds)
    }));

    const formattedLocations = locations.map(l => ({
        ...l,
        excludedFromSchedule: l.excludedFromSchedule === 1
    }));

    return new Response(JSON.stringify({
      locations: formattedLocations,
      staff: formattedStaff,
      topics: topics,
      thirukkurals: thirukkurals,
      attendance_records: attendance, // Frontend இந்த பெயரில்தான் எதிர்பார்க்கிறது
      sharing_configs: formattedSharing,
      postponed_dates: postponed
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  const { request } = context;
  const { type, data } = await request.json();
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
    else if (type === 'staff') {
      await db.prepare("DELETE FROM staff").run();
      const stmt = db.prepare("INSERT INTO staff (id, name, locationId, additionalLocationIds, category, meetId, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
      const chunks = chunkArray(data, BATCH_SIZE);
      for (const chunk of chunks) {
        const batch = chunk.map(s => stmt.bind(s.id, s.name, s.locationId, JSON.stringify(s.additionalLocationIds || []), s.category, s.meetId || null, s.status || null));
        if (batch.length > 0) await db.batch(batch);
      }
    }
    else if (type === 'topics') {
      await db.prepare("DELETE FROM topics").run();
      const stmt = db.prepare("INSERT INTO topics (id, name) VALUES (?, ?)");
      const chunks = chunkArray(data, BATCH_SIZE);
      for (const chunk of chunks) {
        const batch = chunk.map(t => stmt.bind(t.id, t.name));
        if (batch.length > 0) await db.batch(batch);
      }
    }
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
      // மாற்றம்: Bulk Insert Logic
      const stmt = db.prepare(`
        INSERT INTO attendance_records (id, date, staffId, unknownName, meetLink, inTime, outTime, percentage) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
        percentage=excluded.percentage, inTime=excluded.inTime, outTime=excluded.outTime
      `);

      // பாதுகாப்பிற்காக 50 வரிகளாகப் பிரிக்கிறோம்
      const chunks = chunkArray(data, BATCH_SIZE); 
      
      for (const chunk of chunks) {
        const batch = chunk.map(r => stmt.bind(
          r.id, 
          r.date, 
          r.staffId, 
          r.unknownName, 
          r.meetLink, 
          r.inTime, 
          r.outTime, 
          r.percentage
        ));
        
        if (batch.length > 0) await db.batch(batch);
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}