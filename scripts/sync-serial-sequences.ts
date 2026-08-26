import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`
    select setval(
      pg_get_serial_sequence('game', 'id'),
      coalesce((select max(id) from game), 1),
      true
    )
  `;
  await sql`
    select setval(
      pg_get_serial_sequence('player_score', 'id'),
      coalesce((select max(id) from player_score), 1),
      true
    )
  `;
  await sql`
    select setval(
      pg_get_serial_sequence('player', 'id'),
      coalesce((select max(id) from player), 1),
      true
    )
  `;
  await sql`
    select setval(
      pg_get_serial_sequence('location', 'id'),
      coalesce((select max(id) from location), 1),
      true
    )
  `;

  const rows = await sql`
    select
      'game' as table_name,
      (select max(id) from game) as max_id,
      (select last_value from game_id_seq) as last_value
    union all
    select 'player_score', (select max(id) from player_score), (select last_value from player_score_id_seq)
    union all
    select 'player', (select max(id) from player), (select last_value from player_id_seq)
    union all
    select 'location', (select max(id) from location), (select last_value from location_id_seq)
  `;
  console.log(JSON.stringify(rows, null, 2));
}

main();
