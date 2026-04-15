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
const TRAP_CHANNEL_ID = '1493606848371359884'
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
})

setInterval(() => {
  console.log("Still alive...");
}, 300000); // every 5 minutes

client.on('messageCreate', async (message) => {
  try {
    // Ignore bots (optional, but recommended)
    if (message.author.bot) return;

    // Only target specific channel
    if (message.channel.id !== TRAP_CHANNEL_ID) return;

    // Ignore admins (VERY IMPORTANT)
    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    // Ban the user
    await message.guild.members.ban(message.author.id, {
      reason: 'Triggered anti-spam trap channel'
    });

    console.log(`Banned ${message.author.tag} for trap channel message`);

  } catch (err) {
    console.error('Ban error:', err);
  }
});

client.login(TOKEN);
