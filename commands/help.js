const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

// Si quieres que sea un mention real, usa el ID del usuario:
// (pon aquí el ID real de PALTAMAN)
const PALTAMAN_ID = '291312809642295298';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra la lista de comandos disponibles'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x8B4DDE)
      .setTitle('📌 Ayuda - Comandos')
      .setDescription([
        'Lista rápida de comandos del bot.',
        '',
        `Cualquier duda contactarse con <@${PALTAMAN_ID}>.`
      ].join('\n'))
      .addFields(
        {
          name: 'Partys (PvE)',
          value: [
            '`/party` → Crear grupo general (hasta 5).',
            '`/config-party` → Configura el party general. (ADMIN)',
            '`/miru` → Party Mirumok Dekia (3).',
            '`/gyfin` → Party Gyfin Dekia (3).',
            '`/altar` → Party Altar de Sangre (3).',
          ].join('\n'),
          inline: false
        },
        {
          name: 'Eventos / Escuadrones',
          value: [
            '`/liga dia hora` → Escuadrón liga de gremios.',
            '`/maritima dia` → Escuadrón marítimo.',
            '`/node dia` → Escuadrón Node War T1.',
          ].join('\n'),
          inline: false
        },
        {
          name: 'Bosses',
          value: [
            '`/boses` → Muestra cuenta regresiva de bosses.',
            '`/config-boses` → Configura hora fija de bosses. (ADMIN)',
          ].join('\n'),
          inline: false
        },
        {
          name: 'Utilidades',
          value: [
            '`/cupon codigo` → Publica un cupón con reacciones.',
          ].join('\n'),
          inline: false
        },
        {
          name: 'Tip',
          value: 'En comandos de party puedes usar botones para unirte/salir y el creador puede editar/agregar/sacar.',
          inline: false
        }
      );

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }
};
