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

      await message.guild.members.ban(message.author.id, {
        reason: 'Trap channel triggered',
        deleteMessageSeconds: 60 * 60 * 24
      });

      const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);

      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🚨 User Banned')
          .setColor(0xff0000)
          .addFields(
            { name: 'User', value: message.author.tag, inline: true },
            { name: 'User ID', value: message.author.id, inline: true },
            { name: 'Channel', value: `<#${message.channel.id}>`, inline: true }
          )
          .setTimestamp();

        logChannel.send({ embeds: [embed] });
      }

      return;
    }

    // =========================
    // ⚠️ WARN COMMAND
    // =========================
    if (message.content.startsWith('!warn')) {

      if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You don't have permission to warn.");
      }

      const args = message.content.split(' ');
      const user = message.mentions.users.first();
      const reason = args.slice(2).join(' ') || 'No reason provided';

      if (!user) {
        return message.reply('Please mention a user.');
      }

      if (!warnings[user.id]) {
        warnings[user.id] = [];
      }

      const warning = {
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
          { name: 'Moderator', value: message.author.tag, inline: true },
          { name: 'User', value: user.tag, inline: true },
          { name: 'Total Warnings', value: `${warnings[user.id].length}`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    }

    // =========================
    // 📊 WARNINGS COMMAND
    // =========================
    if (message.content.startsWith('!warnings')) {

      const user = message.mentions.users.first();

      if (!user) {
        return message.reply('Please mention a user.');
      }

      const userWarnings = warnings[user.id];

      if (!userWarnings || userWarnings.length === 0) {
        return message.channel.send(`✅ ${user.tag} has no warnings.`);
      }

      const embed = new EmbedBuilder()
        .setTitle(`📊 Warnings for ${user.tag}`)
        .setColor(0x0099ff)
        .setDescription(`Total Warnings: ${userWarnings.length}`)
        .setTimestamp();

      userWarnings.forEach((warn, index) => {
        embed.addFields({
          name: `Warning ${index + 1}`,
          value: `📝 ${warn.reason}\n👮 ${warn.moderator}\n📅 ${warn.date}`
        });
      });

      message.channel.send({ embeds: [embed] });
    }

  } catch (err) {
    console.error(err);
  }
});

client.login(TOKEN);

// 🛡️ Crash protection
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);
