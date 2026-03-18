import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)


import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();


  let challenge;
  let challengeError;
  let challengeId = req.body?.challengeId;

  if (!challengeId) {
    // 1. جلب جميع التحديات
    const { data: allChallenges, error: allError } = await supabase
      .from('challenges')
      .select('id, title, description, challenge_type, points_reward');
    if (allError || !allChallenges || allChallenges.length === 0) {
      console.error('Error fetching challenges:', allError);
      return res.status(404).json({ error: 'No challenges found' });
    }

    // 2. جلب جميع التحديات التي تم استخدامها في daily_challenges
    const { data: usedRows, error: usedError } = await supabase
      .from('daily_challenges')
      .select('challenge_id');
    if (usedError) {
      console.error('Error fetching used daily challenges:', usedError);
    }
    const usedIds = usedRows ? usedRows.map((row: any) => row.challenge_id) : [];

    // 3. استخراج التحديات غير المستخدمة
    let unusedChallenges = allChallenges.filter((c: any) => !usedIds.includes(c.id));

    // إذا انتهت كل التحديات، احذف daily_challenges وابدأ دورة جديدة
    if (unusedChallenges.length === 0) {
      // حذف جميع daily_challenges (يمكنك تخصيص الحذف حسب الحاجة)
      const { error: deleteError } = await supabase
        .from('daily_challenges')
        .delete()
        .not('id', 'is', null); // شرط صحيح لحذف كل شيء
      if (deleteError) {
        console.error('Error deleting daily challenges:', deleteError);
        return res.status(500).json({ error: 'Failed to reset daily challenges: ' + deleteError.message });
      }
      // بعد الحذف، كل التحديات تصبح غير مستخدمة
      unusedChallenges = [...allChallenges];
    }

    // اختر تحدي عشوائي من غير المستخدمة
    const randomIndex = Math.floor(Math.random() * unusedChallenges.length);
    const selectedChallenge = unusedChallenges[randomIndex];
    challenge = selectedChallenge;
    challengeError = null;
    challengeId = challenge?.id;
  } else {
    // جلب بيانات التحدي المحدد
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();
    if (error) {
      console.error('Error fetching specific challenge:', error);
    }
    challenge = data;
    challengeError = error;
  }

  if (challengeError || !challenge) {
    console.error('Challenge not found:', challengeError);
    return res.status(404).json({ error: 'Challenge not found' });
  }

  // تحديث أو إضافة صف اليوم في جدول daily_challenges
  const today = new Date().toISOString().split('T')[0]
  // تحقق هل يوجد صف اليوم
  const { data: todayRow, error: todayRowError } = await supabase
    .from('daily_challenges')
    .select('id')
    .eq('date', today)
    .single()
  if (todayRowError) {
    console.error('Error fetching todayRow:', todayRowError);
  }

  if (todayRow) {
    // إذا كان موجود حدثه
    const { error: updateError } = await supabase
      .from('daily_challenges')
      .update({
        challenge_id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        challenge_type: challenge.challenge_type,
        points_reward: challenge.points_reward,
      })
      .eq('date', today)
    if (updateError) {
      console.error('Error updating todayRow:', updateError);
      return res.status(500).json({ error: updateError.message })
    }
    return res.status(200).json({ success: true, updated: true })
  } else {
    // إذا لم يكن موجود أضفه
    const { error: insertError } = await supabase
      .from('daily_challenges')
      .insert({
        date: today,
        challenge_id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        challenge_type: challenge.challenge_type,
        points_reward: challenge.points_reward,
      })
    if (insertError) {
      console.error('Error inserting todayRow:', insertError);
      return res.status(500).json({ error: insertError.message })
    }
    return res.status(200).json({ success: true, inserted: true })
  }
}
