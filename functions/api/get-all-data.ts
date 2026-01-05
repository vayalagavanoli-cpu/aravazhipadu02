export const onRequestGet = async (context) => {
  const { env } = context;

  // Run all queries at once
  const [locs, stf, tops, kurals, share] = await Promise.all([
    env.DB.prepare("SELECT * FROM locations").all(),
    env.DB.prepare("SELECT * FROM staff").all(),
    env.DB.prepare("SELECT * FROM topics").all(),
    env.DB.prepare("SELECT * FROM thirukkurals").all(),
    env.DB.prepare("SELECT * FROM sharing_configs").all(),
  ]);

  return new Response(JSON.stringify({
    locations: locs.results,
    staff: stf.results,
    topics: tops.results,
    thirukkurals: kurals.results,
    sharingConfigs: share.results.map(s => ({...s, locationIds: JSON.parse(s.locationIds)}))
  }), { headers: { "Content-Type": "application/json" } });
};