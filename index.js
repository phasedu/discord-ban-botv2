const express = require('express');
const app = express();

const { Client, GatewayIntentBits, PermissionsBitField, Events } = require('discord.js');
const admin = require('firebase-admin');

// 🔐 Firebase (from Render env)
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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

// 🌐 Web server (Render)
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// 🤖 Ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ❤️ Heartbeat
setInterval(() => {
  console.log("Still alive...");
}, 300000);

// 🚨 Trap system
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.member) return;

    if (message.channel.id !== TRAP_CHANNEL_ID) return;

    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

    await message.delete().catch(() => {});

    const messages = await message.channel.messages.fetch({ limit: 100 });
    const userMessages = messages.filter(msg => msg.author.id === message.author.id);

    await message.channel.bulkDelete(userMessages, true).catch(() => {});

    await message.guild.members.ban(message.author.id, {
      reason: 'Trap triggered',
      deleteMessageSeconds: 60 * 60 * 24
    });

    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);

    if (logChannel) {
      logChannel.send(`🚨 Banned ${message.author.tag} (Trap channel)`);
    }

  } catch (err) {
    console.error(err);
  }
});

// ⚠️ /warn command
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'warn') {
    try {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return interaction.reply({ content: "No permission.", ephemeral: true });
      }

      const ref = db.collection('warnings').doc(user.id);
      const doc = await ref.get();

      let count = 0;
      if (doc.exists) count = doc.data().count || 0;

      count++;

      await ref.set({ count });

      const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
      const date = new Date().toLocaleString();

      if (logChannel) {
        logChannel.send(`⚠️ Warning Issued

Moderator: ${interaction.user.tag}
User: ${user.tag}
Date: ${date}
Reason: ${reason}
Total Warnings: ${count}`);
      }

      await interaction.reply({
        content: `✅ Warned ${user.tag} (Total: ${count})`,
        ephemeral: true
      });

    } catch (err) {
      console.error(err);
      interaction.reply({ content: "Error.", ephemeral: true });
    }
  }
});

client.login(TOKEN);

// 🛡️ Crash protection
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);
