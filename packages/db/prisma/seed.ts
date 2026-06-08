import { PrismaClient, ContentType, Language } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const channel = await prisma.telegramChannel.upsert({
    where: { chatId: process.env.TELEGRAM_CHANNEL_ID || '@test_channel' },
    update: {},
    create: {
      name: 'Казино Канал',
      chatId: process.env.TELEGRAM_CHANNEL_ID || '@test_channel',
      botToken: process.env.TELEGRAM_BOT_TOKEN || 'placeholder',
      description: 'Основний канал про онлайн-казино',
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

  const posts = [
    {
      title: '🎰 Топ-5 слотів тижня',
      content:
        '🎰 *Топ-5 слотів цього тижня*\n\nОбрали найгарячіші слоти для вас:\n\n1️⃣ Book of Ra — класика жанру\n2️⃣ Sweet Bonanza — солодкі виграші\n3️⃣ Gates of Olympus — дари богів\n4️⃣ Wolf Gold — дикий захід\n5️⃣ Starburst — зоряна класика\n\nЯкий ваш улюблений? 👇',
      type: ContentType.short_post,
      language: Language.uk,
      status: 'approved' as const,
    },
    {
      title: 'Відповідальна гра',
      content:
        '⚠️ *Грай відповідально*\n\nАзартні ігри мають бути розвагою, а не способом заробітку.\n\n✅ Встановлюй ліміти на депозит\n✅ Роби перерви\n✅ Грай тільки на те, що готовий витратити\n✅ Якщо гра перестала бути розвагою — зупинись\n\n📞 Безкоштовна гаряча лінія підтримки: 0 800 500 335',
      type: ContentType.responsible_gambling,
      language: Language.uk,
      status: 'approved' as const,
    },
    {
      title: 'Міф чи факт: система мартингейл',
      content:
        '🔍 *Міф чи факт?*\n\n❌ МІФ: «Система Мартингейл гарантує виграш»\n\n✅ ФАКТ: Жодна система ставок не може гарантувати виграш. Казино завжди має математичну перевагу. Мартингейл може збільшити короткострокові шанси, але при довгій грі ризик великих втрат зростає.\n\n💡 Грай розумно та в межах свого бюджету.',
      type: ContentType.myth_fact,
      language: Language.uk,
      status: 'draft' as const,
    },
  ]

  for (const post of posts) {
    await prisma.post.create({
      data: {
        ...post,
        sourceId: source.id,
      },
    })
  }

  console.log(`✅ Seeded: channel "${channel.name}", ${posts.length} posts`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
