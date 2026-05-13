const express = require('express');
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionsBitField
} = require('discord.js');

require('dotenv').config();

const app = express();

/* =========================
   웹 서버 (Render 유지용)
========================= */

app.get('/', (req, res) => {
  res.send('Timeout Bot Online');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🌐 Web server running');
});

/* =========================
   디스코드 클라이언트
========================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* =========================
   슬래시 명령어
========================= */

const commands = [
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('유저를 영구 서버 차단합니다')
    .addUserOption(option =>
      option
        .setName('유저')
        .setDescription('차단할 유저')
        .setRequired(true)
    )
].map(command => command.toJSON());

/* =========================
   명령어 등록
========================= */

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🔄 슬래시 명령어 등록중...');

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log('✅ 슬래시 명령어 등록 완료');
  } catch (err) {
    console.error('❌ 명령어 등록 오류:', err);
  }
})();

/* =========================
   봇 로그인
========================= */

client.once('clientReady', () => {
  console.log(`🤖 ${client.user.tag} 로그인 완료`);
});

/* =========================
   명령어 실행
========================= */

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'timeout') {

    /* 관리자 권한 체크 */
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.BanMembers
      )
    ) {
      return interaction.reply({
        content: '❌ 차단 권한이 없습니다.',
        ephemeral: true
      });
    }

    const target = interaction.options.getUser('유저');

    try {

      const member = await interaction.guild.members.fetch(target.id);

      /* 자기 자신 차단 방지 */
      if (target.id === interaction.user.id) {
        return interaction.reply({
          content: '❌ 자기 자신은 차단할 수 없습니다.',
          ephemeral: true
        });
      }

      /* 서버장 차단 방지 */
      if (target.id === interaction.guild.ownerId) {
        return interaction.reply({
          content: '❌ 서버장은 차단할 수 없습니다.',
          ephemeral: true
        });
      }

      /* 역할 우선순위 체크 */
      if (
        member.roles.highest.position >=
        interaction.member.roles.highest.position
      ) {
        return interaction.reply({
          content: '❌ 본인보다 높은 역할은 차단할 수 없습니다.',
          ephemeral: true
        });
      }

      /* 실제 차단 */
      await member.ban({
        deleteMessageSeconds: 0,
        reason: `${interaction.user.username} 에 의해 영구 차단됨`
      });

      await interaction.reply({
        content: `✅ ${target.username} 영구 서버 차단 완료`
      });

      console.log(
        `🔨 ${target.username} 차단됨 | 관리자: ${interaction.user.username}`
      );

    } catch (err) {

      console.error('❌ 차단 오류:', err);

      if (!interaction.replied) {
        await interaction.reply({
          content: '❌ 차단 실패',
          ephemeral: true
        });
      }
    }
  }
});

/* =========================
   로그인
========================= */

client.login(process.env.TOKEN);
