const { EmbedBuilder, Events } = require('discord.js');

module.exports = {
    data: {
        name: 'cupon',
        description: 'Mostrar cupón promocional',
    },
    async execute(interaction) {
        const codigo = interaction.options.getString('codigo');
        const color = 0x8B4DDE;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: 'Cupón disponible', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('🎟️ Código promocional')
            .setDescription('Reacciona para indicar si lo usaste, si no funciona o si te fue indiferente.')
            .addFields({ name: 'Código', value: `\`\`\`\n${codigo}\n\`\`\``, inline: false })
            .setImage('https://cdn.discordapp.com/attachments/639904843888197674/1430403961927634974/Images.webp')
            .setFooter({ text: `Publicado por ${interaction.user.username}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        const mensaje = await interaction.fetchReply().catch(() => null);
        if (mensaje) {
            await mensaje.react('✅').catch(() => { });
            await mensaje.react('🚫').catch(() => { });
            await mensaje.react('🙂').catch(() => { });
        }
    }
};
