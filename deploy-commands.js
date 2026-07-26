const {
  REST,
  Routes,
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1493758908781826188';

const commands = [
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for warning')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('clearwarn')
    .setDescription('Remove a specific warning')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('id')
        .setDescription('Warning ID (#001)')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('clearwarnall')
    .setDescription('Remove all warnings')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Delete a specific message')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel containing the message')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('messageid')
        .setDescription('ID of the message')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for deleting the message')
        .setRequired(false)
    ),

  new ContextMenuCommandBuilder()
    .setName('Delete Message')
    .setType(ApplicationCommandType.Message)

].map(cmd => cmd.toJSON());
