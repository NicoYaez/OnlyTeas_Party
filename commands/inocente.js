const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const COLORS = {
    good: 0x57F287,
    bad: 0xED4245,
    warn: 0xFEE75C,
};

const INNOCENT_SPEED = {
    minGrowths: {
        1: 1.2,
        2: 0.1,
        3: 0.1,
        4: 0.2,
        5: 0.1,
        6: 0.1,
        7: 0.3,
        8: 0.2,
        9: 0.2,
        10: 0.3
    },
    maxGrowths: {
        1: 1.2,
        2: 0.2,
        3: 0.2,
        4: 0.3,
        5: 0.3,
        6: 0.3,
        7: 0.4,
        8: 0.3,
        9: 0.3,
        10: 0.5
    },
    min: 2.8,
    avg: 3.4,
    max: 4.0
};

function roundExcel(value, decimals = 1) {
    const factor = 10 ** decimals;
    return (Math.floor((value * factor) + 0.5) / factor).toFixed(decimals);
}

function sumRemaining(growths, currentLevel) {
    let total = 0;
    for (let lvl = currentLevel + 1; lvl <= 10; lvl++) {
        total += growths[lvl] || 0;
    }
    return total;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inocente')
        .setDescription('Calcula la proyección de Speed para Innocent usando la lógica del Excel')
        .addIntegerOption(option =>
            option
                .setName('nivel')
                .setDescription('Nivel actual del sailor')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10)
        )
        .addStringOption(option =>
            option
                .setName('speed')
                .setDescription('Speed actual, por ejemplo 2.5')
                .setRequired(true)
        ),

    async execute(interaction) {
        const nivel = interaction.options.getInteger('nivel');
        const speedInput = interaction.options.getString('speed', true).trim();
        const goalInput = interaction.options.getString('goal')?.trim() ?? '3.8';

        const speedActual = Number(speedInput.replace(',', '.'));
        const goal = Number(goalInput.replace(',', '.'));

        if (Number.isNaN(speedActual)) {
            return interaction.reply({
                content: 'Ingresa un speed válido, por ejemplo: 2.5',
                ephemeral: true
            });
        }

        if (Number.isNaN(goal)) {
            return interaction.reply({
                content: 'Ingresa un goal válido, por ejemplo: 3.8',
                ephemeral: true
            });
        }

        const remainingMin = sumRemaining(INNOCENT_SPEED.minGrowths, nivel);
        const remainingMax = sumRemaining(INNOCENT_SPEED.maxGrowths, nivel);

        const minFinalRaw = Math.min(speedActual + remainingMin, INNOCENT_SPEED.max);
        const maxFinalRaw = Math.min(speedActual + remainingMax, INNOCENT_SPEED.max);
        const likelyFinalRaw = Math.min((minFinalRaw + maxFinalRaw) / 2, INNOCENT_SPEED.max);

        // redondeados como en el Excel visual
        const minFinal = Number(roundExcel(minFinalRaw));
        const likelyFinal = Number(roundExcel(likelyFinalRaw));
        const maxFinal = Number(roundExcel(maxFinalRaw));
        const goalFinal = Number(roundExcel(goal));

        let color = COLORS.warn;
        let estado = '🟡 Posible';
        let evaluacion = '';

        if (goalFinal > INNOCENT_SPEED.max) {
            color = COLORS.bad;
            estado = '🔴 Imposible';
            evaluacion = `Tu goal de ${roundExcel(goal)} supera el máximo absoluto de Innocent, que es ${roundExcel(INNOCENT_SPEED.max)}.`;
        } else if (goalFinal > maxFinal) {
            color = COLORS.bad;
            estado = '🔴 Imposible';
            evaluacion = `Tu goal de ${roundExcel(goal)} no se puede alcanzar. El máximo esperado es ${roundExcel(maxFinal)}.`;
        } else if (goalFinal <= likelyFinal) {
            color = COLORS.good;
            estado = '🟢 Bien encaminado';
            evaluacion = `Tu sailor va bien encaminado: el goal de ${roundExcel(goal)} es probable según la proyección.`;
        } else {
            color = COLORS.warn;
            estado = '🟡 Posible';
            evaluacion = `Tu goal de ${roundExcel(goal)} es posible, pero depende de rolls altos.`;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: 'Calculadora Innocent',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTitle('⛵ Innocent · Speed final')
            .setDescription(`Proyección de **Speed** usando la misma lógica del Excel.\n**Estado:** ${estado}`)
            .setThumbnail('https://bdocodex.com/items/new_icon/11_employee/employee_59055.webp')
            .addFields(
                {
                    name: '📌 Datos actuales',
                    value:
                        `**Nivel:** ${nivel}\n` +
                        `**Speed:** ${roundExcel(speedActual)}\n` +
                        `**Goal:** ${roundExcel(goal)}`,
                    inline: true
                },
                {
                    name: '📈 Proyección',
                    value:
                        `**Min R:** ${roundExcel(minFinal)}\n` +
                        `**Likely:** ${roundExcel(likelyFinal)}\n` +
                        `**Max R:** ${roundExcel(maxFinal)}`,
                    inline: true
                },
                {
                    name: '📊 Referencia',
                    value:
                        `**Min:** ${roundExcel(INNOCENT_SPEED.min)}\n` +
                        `**AVG:** ${roundExcel(INNOCENT_SPEED.avg)}\n` +
                        `**Max:** ${roundExcel(INNOCENT_SPEED.max)}`,
                    inline: true
                },
                {
                    name: '🧠 Evaluación',
                    value: evaluacion,
                    inline: false
                }
            )
            .setFooter({
                text: `Solicitado por ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};