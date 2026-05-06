const express = require('express');
const app = express();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;

// =========================
// CONFIG
// =========================
const TRAP_CHANNEL_ID = '1494113781289058375';

// =========================
// WEB SERVER (Render)
// =========================
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// =========================
// WARNINGS STORAGE
// =========================
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

// =========================
// READY
// =========================
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// =========================
// HEARTBEAT
// =========================
setInterval(() => {
  console.log('Still alive...');
}, 300000);

// =========================
// 🚨 TRAP CHANNEL SYSTEM
// =========================
client.on('messageCreate', async (message) => {

  try {

    if (message.author.bot) return;
    if (!message.guild) return;

    // Only trap channel
    if (message.channel.id !== TRAP_CHANNEL_ID) return;

    // Ignore admins
    if (
      message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) return;

    // Delete trigger message
    await message.delete().catch(() => {});

    // Ban user + delete recent messages
    await message.guild.members.ban(message.author.id, {
      reason: 'Triggered anti-spam trap channel',
      deleteMessageSeconds: 60 * 60 * 24
    });

    console.log(
      `Banned ${message.author.tag} for trap channel message`
    );

  } catch (err) {
    console.error('Trap system error:', err);
  }

});

// =========================
// SLASH COMMAND HANDLER
// =========================
client.on(Events.InteractionCreate, async (interaction) => {

  if (!interaction.isChatInputCommand()) return;

  // =========================
  // /warn
  // =========================
  if (interaction.commandName === 'warn') {

    if (
      !interaction.memberPermissions.has(
        PermissionsBitField.Flags.KickMembers
      )
    ) {
      return interaction.reply({
        content: 'No permission.',
        ephemeral: true
      });
    }

    const user = interaction.options.getUser('user');
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

    // =========================
    // PUBLIC WARN EMBED
    // =========================
    const warnEmbed = new EmbedBuilder()
      .setTitle('⚠️ Warning Issued')
      .setColor(0xffcc00)
      .addFields(
        {
          name: 'ID',
          value: warnID,
          inline: true
        },
        {
          name: 'User',
          value: user.tag,
          inline: true
        },
        {
          name: 'Moderator',
          value: interaction.user.tag,
          inline: true
        },
        {
          name: 'Reason',
          value: reason
        }
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [warnEmbed]
    });

    // =========================
    // BUTTON PANEL
    // =========================
    const row = new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId(`sendcopy_${user.id}`)
        .setLabel('📩 Send Copy')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`skip_${user.id}`)
        .setLabel('❌ Skip')
        .setStyle(ButtonStyle.Secondary)

    );

    const panelMessage = await interaction.followUp({
      content: 'Would you like to message the user a copy of their warning?',
      components: [row],
      ephemeral: true
    });

    // =========================
    // BUTTON COLLECTOR
    // =========================
    const collector =
      panelMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
      });

    collector.on('collect', async (buttonInteraction) => {

      // Only original mod can press buttons
      if (
        buttonInteraction.user.id !== interaction.user.id
      ) {
        return buttonInteraction.reply({
          content: 'You cannot use these buttons.',
          ephemeral: true
        });
      }

      // =========================
      // SEND COPY
      // =========================
      if (
        buttonInteraction.customId ===
        `sendcopy_${user.id}`
      ) {

        try {

          const dmEmbed = new EmbedBuilder()
            .setTitle('⚠️ Warning Notice')
            .setColor(0xffcc00)
            .setDescription(
              'You have received a warning.'
            )
            .addFields(
              {
                name: 'Server',
                value: interaction.guild.name,
                inline: true
              },
              {
                name: 'Moderator',
                value: interaction.user.tag,
                inline: true
              },
              {
                name: 'Warning ID',
                value: warnID,
                inline: true
              },
              {
                name: 'Reason',
                value: reason
              }
            )
            .setFooter({
              text:
                'Please follow server rules to avoid further moderation actions.'
            })
            .setTimestamp();

          await user.send({
            embeds: [dmEmbed]
          });

          const disabledRow =
            new ActionRowBuilder().addComponents(

              ButtonBuilder
                .from(row.components[0])
                .setDisabled(true),

              ButtonBuilder
                .from(row.components[1])
                .setDisabled(true)

            );

          await buttonInteraction.update({
            content: '✅ Warning copy sent.',
            components: [disabledRow]
          });

        } catch {

          const disabledRow =
            new ActionRowBuilder().addComponents(

              ButtonBuilder
                .from(row.components[0])
                .setDisabled(true),

              ButtonBuilder
                .from(row.components[1])
                .setDisabled(true)

            );

          await buttonInteraction.update({
            content: '❌ Could not DM this user.',
            components: [disabledRow]
          });
        }

        collector.stop();
      }

      // =========================
      // SKIP
      // =========================
      else if (
        buttonInteraction.customId ===
        `skip_${user.id}`
      ) {

        const disabledRow =
          new ActionRowBuilder().addComponents(

            ButtonBuilder
              .from(row.components[0])
              .setDisabled(true),

            ButtonBuilder
              .from(row.components[1])
              .setDisabled(true)

          );

        await buttonInteraction.update({
          content: '❌ Warning copy skipped.',
          components: [disabledRow]
        });

        collector.stop();
      }

    });

    // =========================
    // EXPIRE BUTTONS
    // =========================
    collector.on('end', async (_, reasonEnded) => {

      if (reasonEnded === 'time') {

        const disabledRow =
          new ActionRowBuilder().addComponents(

            ButtonBuilder
              .from(row.components[0])
              .setDisabled(true),

            ButtonBuilder
              .from(row.components[1])
              .setDisabled(true)

          );

        await panelMessage.edit({
          content: '⌛ DM option expired.',
          components: [disabledRow]
        }).catch(() => {});
      }

    });

  }

  // =========================
  // /warnings
  // =========================
  else if (interaction.commandName === 'warnings') {

    const user = interaction.options.getUser('user');

    const userWarnings = warnings[user.id];

    if (
      !userWarnings ||
      userWarnings.length === 0
    ) {
      return interaction.reply({
        content: `✅ ${user.tag} has no warnings.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 Warnings for ${user.tag}`)
      .setColor(0x0099ff)
      .setDescription(
        `Total Warnings: ${userWarnings.length}`
      )
      .setTimestamp();

    userWarnings.forEach((w) => {

      embed.addFields({
        name: `${w.id}`,
        value:
          `📝 ${w.reason}\n` +
          `👮 ${w.moderator}\n` +
          `📅 ${w.date}`
      });

    });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

  }

  // =========================
  // /clearwarn
  // =========================
  else if (interaction.commandName === 'clearwarn') {

    if (
      !interaction.memberPermissions.has(
        PermissionsBitField.Flags.KickMembers
      )
    ) {
      return interaction.reply({
        content: 'No permission.',
        ephemeral: true
      });
    }

    const user = interaction.options.getUser('user');
    const id = interaction.options.getString('id');

    if (!warnings[user.id]) {
      return interaction.reply({
        content: 'User has no warnings.',
        ephemeral: true
      });
    }

    const index =
      warnings[user.id].findIndex(
        w => w.id === id
      );

    if (index === -1) {
      return interaction.reply({
        content: 'Warning ID not found.',
        ephemeral: true
      });
    }

    const removed =
      warnings[user.id].splice(index, 1);

    saveWarnings();

    const embed = new EmbedBuilder()
      .setTitle('🧹 Warning Removed')
      .setColor(0x00cc66)
      .addFields(
        {
          name: 'User',
          value: user.tag,
          inline: true
        },
        {
          name: 'Removed ID',
          value: id,
          inline: true
        },
        {
          name: 'Reason',
          value: removed[0].reason
        }
      )
      .setTimestamp();

    return interaction.reply({
      embeds: [embed]
    });

  }

  // =========================
  // /clearwarnall
  // =========================
  else if (
    interaction.commandName ===
    'clearwarnall'
  ) {

    if (
      !interaction.memberPermissions.has(
        PermissionsBitField.Flags.KickMembers
      )
    ) {
      return interaction.reply({
        content: 'No permission.',
        ephemeral: true
      });
    }

    const user = interaction.options.getUser('user');

    const total =
      warnings[user.id]?.length || 0;

    delete warnings[user.id];

    saveWarnings();

    const embed = new EmbedBuilder()
      .setTitle('🔥 All Warnings Cleared')
      .setColor(0xff4444)
      .addFields(
        {
          name: 'User',
          value: user.tag,
          inline: true
        },
        {
          name: 'Removed Warnings',
          value: `${total}`,
          inline: true
        }
      )
      .setTimestamp();

    return interaction.reply({
      embeds: [embed]
    });

  }

});

client.login(TOKEN);

// =========================
// CRASH PROTECTION
// =========================
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error); 
