const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionsBitField
} = require('discord.js');

require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// 슬래시 명령어 등록
const commands = [
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('유저를 영구 서버 차단')
    .addUserOption(option =>
      option
        .setName('유저')
        .setDescription('차단할 유저')
        .setRequired(true)
    )
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('슬래시 명령어 등록중...');

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log('등록 완료');
  } catch (error) {
    console.error(error);
  }
})();

client.on('ready', () => {
  console.log(`${client.user.tag} 로그인 완료`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'timeout') {

    // 관리자 권한 체크
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({
        content: '밴 권한이 없음',
        ephemeral: true
      });
    }

    const target = interaction.options.getUser('유저');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: '유저를 찾을 수 없음',
        ephemeral: true
      });
    }

    try {
      await member.ban({
        deleteMessageSeconds: 0,
        reason: `${interaction.user.tag} 에 의해 차단됨`
      });

      await interaction.reply({
        content: `✅ ${target.tag} 영구 서버 차단 완료`
      });

    } catch (err) {
      console.error(err);

      await interaction.reply({
        content: '차단 실패',
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);