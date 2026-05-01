const express = require('express');
const app = express();

const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');

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

// 📂 Load warnings
let warnings = {};

try {
  warnings = JSON.parse(fs.readFileSync('./warnings.json'));
} catch {
  warnings = {};
}

// 💾 Save warnings
function saveWarnings() {
  fs.writeFileSync('./warnings.json', JSON.stringify(warnings, null, 2));
}

// 🤖 Ready
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

    // =========================
    // 🚨 TRAP SYSTEM
    // =========================
    if (message.channel.id === TRAP_CHANNEL_ID) {

      if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

      await message.delete().catch(() => {});

      const messages = await message.channel.messages.fetch({ limit: 100 });
      const userMessages = messages.filter(msg => msg.author.id === message.author.id);

      await message.channel.bulkDelete(userMessages, true).catch(() => {});

      await
