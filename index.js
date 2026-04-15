const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;

// 🔑 PUT YOUR CHANNEL ID HERE
const TRAP_CHANNEL_ID = '1493606848371359884';

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ❤️ Heartbeat
setInterval(() => {
  console.log("Still alive...");
}, 300000);

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.member) return;

    if (message.channel.id !== TRAP_CHANNEL_ID) return;

    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    // Check bot permissions
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      console.log("Missing ban permissions");
      return;
    }

    // Delete message (optional)
    await message.delete().catch(() => {});

    // Ban user
    await message.guild.members.ban(message.author.id, {
      reason: 'Triggered anti-spam trap channel'
    });

    console.log(`Banned ${message.author.tag}`);

  } catch (err) {
    console.error('Ban error:', err);
  }
});

client.login(TOKEN);

// 🛡️ Prevent crashes
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);
