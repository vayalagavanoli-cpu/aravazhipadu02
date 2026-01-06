
import { PagesFunction, EventContext } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

// Ensure the type is PagesFunction<Env>
export const onRequest: PagesFunction<Env> = async (context: EventContext<Env, any, any>) => {
  const { request, env } = context;

  // --- 1. GET Request: Fetch all data from Database ---
  if (request.method === "GET") {
  try {
    const data = await Promise.all([
      env.DB.prepare("SELECT * FROM locations").all(),
      env.DB.prepare("SELECT * FROM staff").all(),
      env.DB.prepare("SELECT * FROM topics").all(),
      env.DB.prepare("SELECT * FROM thirukkurals").all(),
      env.DB.prepare("SELECT * FROM attendance_records").all(),
      env.DB.prepare("SELECT * FROM postponed_dates").all(),
      env.DB.prepare("SELECT * FROM sharing_configs").all(),
    ]);

    return new Response(JSON.stringify({
      locations: data[0].results,
      staff: data[1].results,
      topics: data[2].results,
      thirukkurals: data[3].results,
      attendance_records: data[4].results,
      postponed_dates: data[5].results,
      sharing_configs: data[6].results,
    }), { headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  // --- 2. POST Request: Save data to Database ---
  if (request.method === "POST") {
    try {

    const body = await request.json() as any;
      const { type, data } = body;

      // Log the data to Cloudflare Real-time logs so you can see it
      console.log(`Syncing ${type}:`, data);

      if (type === 'staff') {
        await env.DB.prepare(
          "INSERT OR REPLACE INTO staff (id, name, locationId, category, meetId, status) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(data.id, data.name, data.locationId, data.category, data.meetId, data.status).run();
      } 
      else if (type === 'attendance') {
  await env.DB.prepare(
    "INSERT INTO attendance_records (id, date, staffId, meetLink, inTime, outTime, percentage, unknownName) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    data.id, 
    data.date, 
    data.staffId, 
    data.meetLink || '', 
    data.inTime || '', 
    data.outTime || '', 
    data.percentage, 
    data.unknownName || null // Handle undefined unknownName
  ).run();
}
      else if (type === 'locations') {
  const excluded=data.excludedFromSchedule ? 1 : 0 // Convert true/false to 1/0
        await env.DB.prepare(
    "INSERT OR REPLACE INTO locations (id, name, excludedFromSchedule) VALUES (?, ?, ?)"
  ).bind(
    data.id, 
    data.name, 
   excluded
  ).run();
}
      else if (type === 'topics') {
        await env.DB.prepare(
          "INSERT OR REPLACE INTO topics (id, name) VALUES (?, ?)"
        ).bind(data.id, data.name).run();
      }
      else if (type === 'postponed_dates') {
        await env.DB.prepare(
          "INSERT INTO postponed_dates (originalDate, newDate) VALUES (?, ?)"
        ).bind(data.originalDate, data.newDate).run();
      }
      // You can add leave_days and other types here...

      return new Response("Success", { status: 200 });
    } catch (e: any) {

        console.error("Database Error:", e.message);
       return new Response(JSON.stringify({ error: e.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json" } 
      });
        
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
};