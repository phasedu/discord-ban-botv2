const express = require('express');
const app = express();

const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

// CONFIG
const TRAP_CHANNEL_ID = '1493606848371359884';

// Web server
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(PORT);

// Load warnings
let warnings = {};
try {
  warnings = JSON.parse(fs.readFileSync('./warnings.json'));
} catch {
  warnings = {};
}

function saveWarnings() {
  fs.writeFileSync('./warnings.json', JSON.stringify(warnings, null, 2));
}

function generateWarnID(userId) {
  const count = warnings[userId]?.length || 0;
  return `#${String(count + 1).padStart(3, '0')}`;
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// =========================
// SLASH COMMAND HANDLER
// =========================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const user = interaction.options.getUser('user');

  // =========================
  // /warn
  // =========================
  if (interaction.commandName === 'warn') {

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: "No permission.", ephemeral: true });
    }

    const reason = interaction.options.getString('reason');

    if (!warnings[user.id]) warnings[user.id] = [];

    const warnID = generateWarnID(user.id);

    const warning = {
      id: warnID,
      moderator: interaction.user.tag,
      reason,
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
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // =========================
  // /warnings
  // =========================
  if (interaction.commandName === 'warnings') {

    const userWarnings = warnings[user.id];

    if (!userWarnings || userWarnings.length === 0) {
      return interaction.reply(`✅ ${user.tag} has no warnings.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 Warnings for ${user.tag}`)
      .setColor(0x0099ff)
      .setDescription(`Total: ${userWarnings.length}`);

    userWarnings.forEach(w => {
      embed.addFields({
        name: w.id,
        value: `📝 ${w.reason}\n👮 ${w.moderator}\n📅 ${w.date}`
      });
    });

    return interaction.reply({ embeds: [embed] });
  }

  // =========================
  // /clearwarn
  // =========================
  if (interaction.commandName === 'clearwarn') {

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: "No permission.", ephemeral: true });
    }

    const id = interaction.options.getString('id');

    if (!warnings[user.id]) {
      return interaction.reply("User has no warnings.");
    }

    const index = warnings[user.id].findIndex(w => w.id === id);

    if (index === -1) {
      return interaction.reply("Warning ID not found.");
    }

    const removed = warnings[user.id].splice(index, 1);
    saveWarnings();

    return interaction.reply(`🧹 Removed warning ${id} from ${user.tag}`);
  }

  // =========================
  // /clearwarnall
  // =========================
  if (interaction.commandName === 'clearwarnall') {

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: "No permission.", ephemeral: true });
    }

    const total = warnings[user.id]?.length || 0;

    delete warnings[user.id];
    saveWarnings();

    return interaction.reply(`🔥 Cleared ${total} warnings for ${user.tag}`);
  }
});

client.login(TOKEN);
