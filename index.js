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

// CONFIG
const TRAP_CHANNEL_ID = '1493606848371359884';
const LOG_CHANNEL_ID = '1494114476767838358';

// Web server (Render)
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// Load warnings
let warnings = {};
try {
  warnings = JSON.parse(fs.readFileSync('./warnings.json'));
} catch {
  warnings = {};
}

// Save warnings
function saveWarnings() {
  fs.writeFileSync('./warnings.json', JSON.stringify(warnings, null, 2));
}

// Generate ID (#001)
function generateWarnID(userId) {
  const count = warnings[userId]?.length || 0;
  return `#${String(count + 1).padStart(3, '0')}`;
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Heartbeat
setInterval(() => console.log("Still alive..."), 300000);

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.member) return;

    // =========================
    // 🚨 TRAP SYSTEM
    // =========================
    if (message.channel.id === TRAP_CHANNEL_ID) {

      if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

      await message.delete().catch(() => {});
      await message.guild.members.ban(message.author.id, {
        reason: 'Trap triggered',
        deleteMessageSeconds: 60 * 60 * 24
      });

      return;
    }

    // =========================
    // 🧠 COMMAND PARSER (FIX)
    // =========================
    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();

    // =========================
    // ⚠️ WARN
    // =========================
    if (command === '!warn') {

      if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("No permission.");
      }

      const user = message.mentions.users.first();
      const reason = args.slice(2).join(' ') || 'No reason provided';

      if (!user) return message.reply('Mention a user.');

      if (!warnings[user.id]) warnings[user.id] = [];

      const warnID = generateWarnID(user.id);

      const warning = {
        id: warnID,
        moderator: message.author.tag,
        reason: reason,
        date: new Date().toLocaleString()
      };

      warnings[user.id].push(warning);
      saveWarnings();

      const embed = new EmbedBuilder()
        .setTitle('⚠️ Warning Issued')
        .setColor(0xffcc00)
        .addFields(
          { name: 'ID', value: warnID, inline: true },
          { name: 'User', value: user.tag, inline: true },
          { name: 'Moderator', value: message.author.tag, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
      return;
    }

    // =========================
    // 📊 WARNINGS
    // =========================
    else if (command === '!warnings') {

      const user = message.mentions.users.first();
      if (!user) return message.reply('Mention a user.');

      const userWarnings = warnings[user.id];

      if (!userWarnings || userWarnings.length === 0) {
        return message.channel.send(`✅ ${user.tag} has no warnings.`);
      }

      const embed = new EmbedBuilder()
        .setTitle(`📊 Warnings for ${user.tag}`)
        .setColor(0x0099ff)
        .setDescription(`Total: ${userWarnings.length}`)
        .setTimestamp();

      userWarnings.forEach(w => {
        embed.addFields({
          name: `${w.id}`,
          value: `📝 ${w.reason}\n👮 ${w.moderator}\n📅 ${w.date}`
        });
      });

      message.channel.send({ embeds: [embed] });
      return;
    }

    // =========================
    // 🧹 CLEAR ONE
    // =========================
    else if (command === '!clearwarn') {

      if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("No permission.");
      }

      const user = message.mentions.users.first();
      const warnID = args[2];

      if (!user || !warnID) {
        return message.reply('Usage: !clearwarn @user #ID');
      }

      if (!warnings[user.id]) {
        return message.reply('User has no warnings.');
      }

      const index = warnings[user.id].findIndex(w => w.id === warnID);

      if (index === -1) {
        return message.reply('Warning ID not found.');
      }

      const removed = warnings[user.id].splice(index, 1);
      saveWarnings();

      const embed = new EmbedBuilder()
        .setTitle('🧹 Warning Removed')
        .setColor(0x00cc66)
        .addFields(
          { name: 'User', value: user.tag, inline: true },
          { name: 'Removed ID', value: warnID, inline: true },
          { name: 'Reason', value: removed[0].reason }
        )
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
      return;
    }

    // =========================
    // 🔥 CLEAR ALL
    // =========================
    else if (command === '!clearwarnall') {

      if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("No permission.");
      }

      const user = message.mentions.users.first();
      if (!user) return message.reply('Mention a user.');

      const total = warnings[user.id]?.length || 0;

      if (total === 0) {
        return message.channel.send(`✅ ${user.tag} has no warnings to clear.`);
      }

      delete warnings[user.id];
      saveWarnings();

      const embed = new EmbedBuilder()
        .setTitle('🔥 All Warnings Cleared')
        .setColor(0xff4444)
        .addFields(
          { name: 'User', value: user.tag, inline: true },
          { name: 'Removed Warnings', value: `${total}`, inline: true }
        )
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
      return;
    }

  } catch (err) {
    console.error(err);
  }
});

client.login(TOKEN);

// crash protection
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);
