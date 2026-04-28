const express = require('express');
const app = express();

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;

// 🔑 CONFIG
const TRAP_CHANNEL_ID = '1493606848371359884';
const LOG_CHANNEL_ID = '1494114476767838358';

// 🌐 Web server (Render fix)
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// 🤖 Ready event
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ❤️ Heartbeat (prevents idle)
setInterval(() => {
  console.log("Still alive...");
}, 300000);

// 🚨 Trap system
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.member) return;

    if (message.channel.id !== TRAP_CHANNEL_ID) return;

    // Ignore admins
    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    // Check bot permissions
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      console.log("Missing ban permissions");
      return;
    }

    // 🧹 Delete trigger message
    await message.delete().catch(() => {});

    // 🧹 Delete recent messages from this user (in this channel)
    const messages = await message.channel.messages.fetch({ limit: 100 });
    const userMessages = messages.filter(msg => msg.author.id === message.author.id);

    await message.channel.bulkDelete(userMessages, true).catch(() => {});

    // 🔨 Ban user + delete last 24h messages
    await message.guild.members.ban(message.author.id, {
      reason: 'Triggered anti-spam trap channel',
      deleteMessageSeconds: 60 * 60 * 24
    });

    console.log(`Banned ${message.author.tag}`);

    // 📢 Log to channel
    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);

    if (logChannel) {
      logChannel.send({
        content: `🚨 **User Banned**
User: ${message.author.tag}
ID: ${message.author.id}
Channel: <#${message.channel.id}>
Reason: Trap channel triggered`
      });
    }

  } catch (err) {
    console.error('Ban error:', err);
  }
});

client.login(TOKEN);

// 🛡️ Prevent crashes
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);
