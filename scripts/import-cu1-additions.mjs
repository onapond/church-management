#!/usr/bin/env node
// One-shot import for 1청년부 additions from ref/1청년부 전체 명단 (26.05.08).xlsx.
// Requires SUPABASE_SERVICE_ROLE_KEY so the import can run as an administrative data task.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zikneyjidzovvkmflibo.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY env var is required.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const additions = [
  {
    name: '박철호',
    phone: '010-6335-7653',
    birth_date: '2003-07-02',
    email: null,
    address: '인천광역시 부평구 산청로 97',
  },
  {
    name: '도지수',
    phone: '010-3248-6119',
    birth_date: '2002-11-01',
    email: null,
    address: '강북구 도봉로 290 / 1817호',
  },
  {
    name: '한수연b',
    phone: '010-7335-3794',
    birth_date: '2005-02-25',
    email: null,
    address: '경기도 성남시 분당구',
  },
  {
    name: '강태웅',
    phone: '010-2377-0120',
    birth_date: '2000-05-24',
    email: null,
    address: '서울 마포구 월드컵북로42가길 28 301호',
  },
  {
    name: '임한',
    phone: '010-6776-2619',
    birth_date: '2003-04-25',
    email: null,
    address: '강서로 47길 153 208동 101호',
  },
  {
    name: '최유진',
    phone: '010-2470-9565',
    birth_date: '1999-02-05',
    email: null,
    address: '서울시 성동구 난계로 84, 111동 503호',
  },
  {
    name: '이인혁',
    phone: '010-4224-3448',
    birth_date: '2002-03-20',
    email: null,
    address: null,
  },
  {
    name: '봉준영',
    phone: '010-4497-6497',
    birth_date: '1999-01-24',
    email: null,
    address: '경상남도 거창군 가조면 마상 4길 62. 304호',
  },
]

async function getCu1DepartmentId() {
  const { data, error } = await supabase
    .from('departments')
    .select('id')
    .eq('code', 'cu1')
    .single()

  if (error) throw new Error(`1청년부 부서 조회 실패: ${error.message}`)
  return data.id
}

async function findExistingMember(member) {
  const matchClauses = [
    `and(name.eq.${member.name},birth_date.eq.${member.birth_date})`,
  ]

  if (member.phone) {
    matchClauses.push(`phone.eq.${member.phone}`)
  }

  const { data, error } = await supabase
    .from('members')
    .select('id, name, birth_date, phone')
    .or(matchClauses.join(','))
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`${member.name} 기존 교인 조회 실패: ${error.message}`)
  return data
}

async function ensureDepartmentLink(memberId, departmentId, memberName) {
  const { data: existingLink, error: linkLookupError } = await supabase
    .from('member_departments')
    .select('id')
    .eq('member_id', memberId)
    .eq('department_id', departmentId)
    .maybeSingle()

  if (linkLookupError) {
    throw new Error(`${memberName} 부서 연결 조회 실패: ${linkLookupError.message}`)
  }

  if (existingLink) return 'linked'

  const { error: linkError } = await supabase
    .from('member_departments')
    .insert({
      member_id: memberId,
      department_id: departmentId,
      is_primary: true,
    })

  if (linkError) throw new Error(`${memberName} 부서 연결 실패: ${linkError.message}`)
  return 'link-added'
}

async function importMember(member, departmentId) {
  const existingMember = await findExistingMember(member)

  if (existingMember) {
    const linkStatus = await ensureDepartmentLink(existingMember.id, departmentId, member.name)
    return { name: member.name, status: linkStatus === 'linked' ? 'existing' : 'department-linked' }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('members')
    .insert({
      name: member.name,
      phone: member.phone,
      birth_date: member.birth_date,
      email: member.email,
      address: member.address,
      department_id: departmentId,
      is_active: true,
    })
    .select('id')
    .single()

  if (insertError) throw new Error(`${member.name} 추가 실패: ${insertError.message}`)

  await ensureDepartmentLink(inserted.id, departmentId, member.name)
  return { name: member.name, status: 'inserted' }
}

async function main() {
  const departmentId = await getCu1DepartmentId()
  const results = []

  for (const member of additions) {
    results.push(await importMember(member, departmentId))
  }

  console.table(results)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
