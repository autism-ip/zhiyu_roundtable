/**
 * RLS 策略验证脚本
 * 执行 SQL 查询以检查 Supabase RLS 策略状态
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ppsooztnbrtdaefjitqh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwc29venRuYnJ0ZGFlZmppdHFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUwNDI0MCwiZXhwIjoyMDg5MDgwMjQwfQ.p_UeDvq3rKAhWUvIlYJW85bgvxr8KAjp-u6YU6nzfDM';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function queryRLSPolicies() {
  console.log('=== 查询 RLS 策略 ===\n');

  // 查询所有 RLS 策略
  const { data: policies, error: policiesError } = await supabaseAdmin.rpc('exec', {
    sql: `
      SELECT
        tablename,
        policyname,
        cmd,
        permissive,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `
  });

  if (policiesError) {
    console.error('查询策略失败:', policiesError);

    // 尝试直接查询
    const { data, error } = await supabaseAdmin
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public');

    if (error) {
      console.error('Alternative query also failed:', error);
      console.log('\n尝试使用原始 SQL...');
    } else {
      console.log('pg_policies data:', JSON.stringify(data, null, 2));
    }
  } else {
    console.log('RLS Policies:', JSON.stringify(policies, null, 2));
  }

  // 查询表和 RLS 状态
  console.log('\n=== 查询表 RLS 状态 ===\n');

  const { data: tables, error: tablesError } = await supabaseAdmin.rpc('exec', {
    sql: `
      SELECT
        c.relname as tablename,
        c.relrowsecurity as rls_enabled,
        c.relreplgentype as replication,
        (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.relname AND p.schemaname = 'public') as policy_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname = 'public'
        AND c.relname NOT LIKE 'pg_%'
        AND c.relname NOT LIKE 'sql_%'
      ORDER BY c.relname;
    `
  });

  if (tablesError) {
    console.error('查询表失败:', tablesError);
  } else {
    console.log('Tables RLS Status:', JSON.stringify(tables, null, 2));
  }

  // 查询索引
  console.log('\n=== 查询索引 ===\n');

  const { data: indexes, error: indexesError } = await supabaseAdmin.rpc('exec', {
    sql: `
      SELECT
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
      ORDER BY tablename, indexname;
    `
  });

  if (indexesError) {
    console.error('查询索引失败:', indexesError);
  } else {
    console.log('Indexes:', JSON.stringify(indexes, null, 2));
  }
}

queryRLSPolicies().catch(console.error);
