const {
    SlashCommandBuilder,
    EmbedBuilder,
} = require('discord.js');

const ROLE_ID = '1415032127933907045';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aviso-node')
        .setDescription('Aviso de cupos para Node War')
        .addStringOption(option =>
            option
                .setName('dia')
                .setDescription('Día del aviso')
                .setRequired(true)
                .addChoices(
                    { name: 'Domingo', value: '0' },
                    { name: 'Lunes', value: '1' },
                    { name: 'Martes', value: '2' },
                    { name: 'Miércoles', value: '3' },
                    { name: 'Jueves', value: '4' },
                    { name: 'Viernes', value: '5' },
                    { name: 'Sábado', value: '6' }
                )
        )
        .addIntegerOption(option =>
            option
                .setName('cupo')
                .setDescription('Cupo disponible')
                .setRequired(true)
                .addChoices(
                    { name: '25', value: 25 },
                    { name: '30', value: 30 }
                )
        ),

    async execute(interaction) {
        const dia = interaction.options.getString('dia');
        const cupo = interaction.options.getInteger('cupo');

        const diasTexto = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const targetDow = parseInt(dia, 10);
        const diaNombre = diasTexto[targetDow] ?? 'Día';

        const now = new Date();
        const dowNow = now.getDay();

        let diff = (targetDow - dowNow + 7) % 7;
        if (
            diff === 0 &&
            (now.getHours() > 19 || (now.getHours() === 19 && now.getMinutes() >= 15))
        ) {
            diff = 7;
        }

        const targetLocal = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + diff,
            19, 15, 0, 0
        );

        const nodeTs = Math.floor(targetLocal.getTime() / 1000);

        const embed = new EmbedBuilder()
            .setColor(0x8B4DDE)
            .setAuthor({
                name: 'AVISO!',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTitle('🏰 Pongan Participar')
            .setDescription(
                `Ya pueden marcar **Participar** quienes estén anotados en el bot.\n\n` +
                `Por favor, respeten el BOT; ya estamos todos grandecitos 📞\n` +
                `Si no están **100% seguros** de asistir, saquen su **Participar** para que otra persona pueda tomar el cupo.\n\n` +
                `**Importante:** si a las <t:${nodeTs}:t> la gente anotada en el bot no ha puesto **Participar**, ` +
                `será retirada y se rellenarán los cupos con quienes sí quieran ir.`
            )

        await interaction.reply({
            content: `<@&${ROLE_ID}>`,
            embeds: [embed],
            allowedMentions: { roles: [ROLE_ID] }
        });
    },
};