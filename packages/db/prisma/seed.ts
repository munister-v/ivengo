import { PrismaClient, ContentType, Language } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const channel = await prisma.telegramChannel.upsert({
    where: { chatId: process.env.TELEGRAM_CHANNEL_ID || '@test_channel' },
    update: {},
    create: {
      name: 'Гральний Клуб 🎰',
      chatId: process.env.TELEGRAM_CHANNEL_ID || '@test_channel',
      botToken: process.env.TELEGRAM_BOT_TOKEN || 'placeholder',
      description: 'Основний канал',
      isActive: true,
    },
  })

  const source = await prisma.source.upsert({
    where: { id: 'seed-source-1' },
    update: {},
    create: {
      id: 'seed-source-1',
      name: 'Редакція',
      type: 'manual',
      isActive: true,
    },
  })

  const CTA_URL = 'https://t.me/your_bot?start=bonus'

  const posts: Array<{
    title?: string
    content: string
    type: ContentType
    language: Language
    status: string
    buttons?: object[]
    ctaUrl?: string
  }> = [
    // ── USER STORY ─────────────────────────────────────────────
    {
      title: '🚨 УВАГА Тільки для підписників!',
      content: `🚨 *УВАГА* Тільки для підписників Грального Клубу!

Павло з міста Суми сьогодні поділився з нами таким [скріншотом виграшу](https://t.me/your_channel).

❗️ Ми знайшли бонус для нових гравців, який діє тільки для підписників Грального Клубу!

🔴 Переходь за посиланням та забирай 1 з 45 бонусних кодів, їх розбирають дуже швидко 🔴

_18+ | Грай відповідально_`,
      type: ContentType.user_story,
      language: Language.uk,
      status: 'approved',
      buttons: [{ text: 'ПІДТВЕРДИТИ ✅', url: CTA_URL }],
      ctaUrl: CTA_URL,
    },
    {
      title: 'Оксана з Харкова виграла 21 400 грн',
      content: `🎉 *Оксана з Харкова* щойно поділилась своїм виграшем — *21 400 грн* за один вечір!

💬 «Грала в Book of Ra, ставка 100 грн. Навіть не очікувала такого результату!»

❗️ Ми підготували спеціальний бонус тільки для підписників каналу.

🔴 Забирай 1 з 31 бонусних кодів — розбирають швидко! 🔴

_18+ | Грай відповідально_`,
      type: ContentType.user_story,
      language: Language.uk,
      status: 'approved',
      buttons: [{ text: 'ЗАБРАТИ БОНУС 🎁', url: CTA_URL }],
      ctaUrl: CTA_URL,
    },

    // ── URGENCY OFFER ──────────────────────────────────────────
    {
      title: 'Призи розбирають...',
      content: `*Призи розбирають...*

_Встигни стати тим самим щасливчиком, про котрого напишуть у новинах_

⚡️ *37 бонусних кодів* ще доступні — але щохвилини їх стає менше.

18+`,
      type: ContentType.urgency_offer,
      language: Language.uk,
      status: 'approved',
      buttons: [{ text: 'КРУТАНУТИ 🎰', url: CTA_URL }],
      ctaUrl: CTA_URL,
    },
    {
      title: 'ВСТИГ ЗАБРАТИ БОНУС ДО ВИХІДНИХ?',
      content: `🔥 *ВСТИГ ЗАБРАТИ БОНУС ДО ВИХІДНИХ?* 🔥

⏰ Акція закінчується о *23:59 сьогодні*

💰 +500 фріспінів для нових гравців
🎁 Бонус до першого депозиту 200%
⚡️ Залишилось *23 місця*

Не зволікай — вихідні без бонусу це не вихідні!

_18+_`,
      type: ContentType.urgency_offer,
      language: Language.uk,
      status: 'draft',
      buttons: [{ text: 'ЗАЙНЯТИ МІСЦЕ ⚡️', url: CTA_URL }],
      ctaUrl: CTA_URL,
    },

    // ── ENGAGEMENT POLL ────────────────────────────────────────
    {
      title: 'ВСТИГ ЗАБРАТИ БОНУС?',
      content: '',
      type: ContentType.engagement_poll,
      language: Language.uk,
      status: 'approved',
    },
    {
      title: 'Який твій улюблений слот?',
      content: '🎰 Голосуй за свій улюблений — тримаємо статистику!',
      type: ContentType.engagement_poll,
      language: Language.uk,
      status: 'draft',
    },

    // ── MYTH / FACT ────────────────────────────────────────────
    {
      title: 'Міф: "Гарячий слот" дасть виграш',
      content: `🔍 *Міф vs Факт*

🔴 *МІФ:* «Якщо слот давно не давав виграшу — зараз точно дасть»

✅ *ФАКТ:* Онлайн-слоти використовують генератор випадкових чисел (RNG). Кожен спін незалежний від попередніх. "Гарячих" і "холодних" слотів не існує — це ілюзія.

💡 Грай в межах свого бюджету і отримуй задоволення від процесу, а не від очікування виграшу.

_18+ | Грай відповідально_`,
      type: ContentType.myth_fact,
      language: Language.uk,
      status: 'approved',
    },

    // ── RESPONSIBLE GAMBLING ───────────────────────────────────
    {
      title: 'Грай відповідально — 5 правил',
      content: `⚠️ *Грай відповідально*

✅ Встановлюй ліміт на депозит до початку гри
✅ Грай тільки на ті гроші, які не шкода витратити
✅ Роби паузи — мінімум 15 хвилин кожну годину
✅ Якщо гра перестала бути розвагою — зупинись
✅ Не намагайся відігратись — це найбільша пастка

📞 Безкоштовна лінія психологічної підтримки: *0 800 500 335*

_Тільки 18+_`,
      type: ContentType.responsible_gambling,
      language: Language.uk,
      status: 'approved',
    },
  ]

  for (const postData of posts) {
    const { buttons, ...rest } = postData
    const post = await prisma.post.create({
      data: {
        ...rest,
        status: rest.status as 'draft' | 'approved',
        buttons: buttons as object[] | undefined,
        sourceId: source.id,
      },
    })

    // Add polls for poll types
    if (post.type === ContentType.engagement_poll || post.type === ContentType.poll) {
      const pollData =
        post.title === 'ВСТИГ ЗАБРАТИ БОНУС?'
          ? { question: 'ВСТИГ ЗАБРАТИ БОНУС?', options: ['ТАК ✅', 'НІ ❌'] }
          : {
              question: 'Який твій улюблений слот?',
              options: ['Book of Ra 📖', 'Gates of Olympus ⚡️', 'Sweet Bonanza 🍬', 'Інший 🎰'],
            }

      await prisma.poll.upsert({
        where: { postId: post.id },
        update: {},
        create: {
          postId: post.id,
          question: pollData.question,
          options: pollData.options,
          isAnonymous: true,
        },
      })
    }
  }

  console.log(`✅ Seed complete: channel "${channel.name}", ${posts.length} posts`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
