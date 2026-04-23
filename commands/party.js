const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    UserSelectMenuBuilder, MessageFlags
} = require('discord.js');

function getConfigKey(interaction) {
    const gid = interaction.guildId ?? 'dm';
    return `${gid}`;
}

function getPartyRoleIds(configParty, interaction) {
    const key = getConfigKey(interaction);
    const cfg = configParty?.get(key) || { roles: '' };
    return String(cfg.roles || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .filter(s => /^\d{17,20}$/.test(s));
}

module.exports = {
    data: {
        name: 'party',
        description: 'Crear y manejar una party',
    },

    // Ejecuta el comando /party -> abre modal
    async execute(interaction, gruposActivos, savePartys, client, configParty) {
        // Fecha/hora actual en formato YYYY-MM-DD HH:mm
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const nowText = `${yyyy}-${mm}-${dd} ${hh}:${min}`;

        const modal = new ModalBuilder()
            .setCustomId('party_create_modal')
            .setTitle('Crear Party')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('motivo')
                        .setLabel('Motivo')
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(100)
                        .setPlaceholder('¿Por qué se crea la party?')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('hora')
                        .setLabel('Hora (YYYY-MM-DD HH:mm)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ej: 2025-12-01 21:00')
                        .setValue(nowText)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('descripcion')
                        .setLabel('Descripción')
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(1000)
                        .setPlaceholder('Detalles adicionales')
                )
            );

        await interaction.showModal(modal);
    },

    // Maneja las interacciones de botones, modal, selects relacionada a party
    async handleInteraction(interaction, gruposActivos, savePartys, client, configParty) {

        // --- Helper: parsea "YYYY-MM-DD HH:mm" en hora local ---
        function parseLocalYYYYMMDDHHmm(input) {
            const m = String(input || '').trim().match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
            if (!m) return null;

            const year = Number(m[1]);
            const month = Number(m[2]); // 1-12
            const day = Number(m[3]);
            const hour = Number(m[4]);
            const minute = Number(m[5]);

            const d = new Date(year, month - 1, day, hour, minute, 0, 0);
            if (Number.isNaN(d.getTime())) return null;
            return d;
        }

        // ------- CREAR PARTY DESDE MODAL -------
        if (interaction.isModalSubmit && interaction.customId === 'party_create_modal') {
            const motivo = interaction.fields.getTextInputValue('motivo');
            const horaRaw = interaction.fields.getTextInputValue('hora');
            const descripcion = interaction.fields.getTextInputValue('descripcion') ?? '-';

            const tamano = 5;
            const color = 0x8B4DDE;
            const creador = interaction.user;

            const fechaParty = parseLocalYYYYMMDDHHmm(horaRaw);
            if (!fechaParty) {
                await interaction.reply({
                    content: 'Formato de fecha/hora inválido. Usa YYYY-MM-DD HH:mm',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            const timestamp = Math.floor(fechaParty.getTime() / 1000);

            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: `Grupo creado por ${creador.username}`, iconURL: creador.displayAvatarURL() })
                .setTitle(`⚔️ ¡Nuevo grupo: ${motivo}!`)
                .setDescription('Únete con el botón verde o sal con el rojo.')
                .addFields(
                    { name: 'Descripción', value: `\`\`\`\n${descripcion}\n\`\`\``, inline: false },
                    { name: 'Horario', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`, inline: false },
                    { name: '', value: '*El horario mostrado se ajusta automáticamente a tu zona horaria.*', inline: false },
                    { name: `Miembros (0/${tamano})`, value: '—\nAún no hay inscritos.\n—', inline: false },
                )
                .setImage('https://cdn.discordapp.com/attachments/639904843888197674/1430404685637881957/b25dece51f820240925155420996.png')
                .setFooter({ text: `Cupos: 0/${tamano}` })
                .setTimestamp();

            const joinBtn = new ButtonBuilder().setCustomId('party_join').setLabel('Unirme').setEmoji('✋').setStyle(ButtonStyle.Success);
            const leaveBtn = new ButtonBuilder().setCustomId('party_leave').setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger);
            const editBtn = new ButtonBuilder().setCustomId('party_edit').setLabel('Editar').setStyle(ButtonStyle.Secondary);
            const addBtn = new ButtonBuilder().setCustomId('party_add').setLabel('Agregar a la Party').setStyle(ButtonStyle.Secondary);
            const kickBtn = new ButtonBuilder().setCustomId('party_kick').setLabel('Eliminar de la Party').setStyle(ButtonStyle.Secondary);

            const rowMain = new ActionRowBuilder().addComponents(joinBtn, leaveBtn);
            const rowManage = new ActionRowBuilder().addComponents(editBtn, addBtn, kickBtn);

            // --- NUEVO: roles configurados por servidor ---
            const roleIds = getPartyRoleIds(configParty, interaction);
            const pingText = roleIds.length ? roleIds.map(id => `<@&${id}>`).join(' ') : null; // <@&id> [page:1]

            await interaction.reply({
                content: pingText || undefined,
                embeds: [embed],
                components: [rowMain, rowManage],
                allowedMentions: roleIds.length ? { roles: roleIds } : undefined, // evita pings no deseados
            });

            const mensaje = await interaction.fetchReply();

            gruposActivos.set(mensaje.id, {
                miembros: [],
                motivo,
                descripcion,
                creador,
                mensajeId: mensaje.id,
                color,
                max: tamano,
                hora: timestamp
            });
            savePartys();
            return;
        }

        // ------- Helpers existentes -------
        function getPartyIdFromCustomId(customId, prefixes) {
            if (!customId) return null;
            for (const p of prefixes) {
                if (customId.startsWith(p + ':')) return customId.slice(p.length + 1);
            }
            return null;
        }

        function resolveGrupoFromInteraction(interaction) {
            const idFromCustom = getPartyIdFromCustomId(interaction.customId, ['party_add_select', 'party_kick_select']);
            if (idFromCustom && gruposActivos.has(idFromCustom)) return gruposActivos.get(idFromCustom);

            const mid = interaction.message?.id;
            if (mid && gruposActivos.has(mid)) return gruposActivos.get(mid);

            if (interaction.isModalSubmit?.()) {
                const parts = (interaction.customId || '').split('_');
                const pid = parts[2];
                if (pid && gruposActivos.has(pid)) return gruposActivos.get(pid);
            }
            return null;
        }

        // Resolución grupo
        let grupo = resolveGrupoFromInteraction(interaction);
        if (!grupo) {
            if (interaction.isRepliable())
                await interaction.reply({ content: 'Este grupo ya no está activo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            return;
        }
        const isOwner = interaction.user.id === grupo.creador.id;

        // ------- Botones -------
        if (interaction.isButton()) {
            const user = interaction.user;

            if (interaction.customId === 'party_join') {
                if (grupo.miembros.some(u => u.id === user.id)) {
                    return interaction.reply({ content: 'Ya estás en la party.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }
                if (grupo.miembros.length >= grupo.max) {
                    return interaction.reply({ content: 'El grupo ya está completo.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }
                grupo.miembros.push({ id: user.id, tag: user.username });
                savePartys();
                await this.renderGrupo(interaction, grupo, `${user.username} se unió al grupo.`);
                return;
            }

            if (interaction.customId === 'party_leave') {
                if (!grupo.miembros.some(u => u.id === user.id)) {
                    return interaction.reply({ content: 'No formas parte de este grupo.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }
                grupo.miembros = grupo.miembros.filter(u => u.id !== user.id);
                savePartys();
                await this.renderGrupo(interaction, grupo, `${user.username} salió del grupo.`);
                return;
            }

            if (interaction.customId === 'party_edit') {
                if (!isOwner) return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });

                // Convertir timestamp a string "YYYY-MM-DD HH:mm"
                let horaTexto = '';
                if (grupo.hora) {
                    const d = new Date(grupo.hora * 1000);
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const hh = String(d.getHours()).padStart(2, '0');
                    const min = String(d.getMinutes()).padStart(2, '0');
                    horaTexto = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
                }

                const modal = new ModalBuilder()
                    .setCustomId(`party_modal_${grupo.mensajeId}`)
                    .setTitle('Editar party')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('motivo')
                                .setLabel('Motivo')
                                .setStyle(TextInputStyle.Short)
                                .setMaxLength(100)
                                .setValue(grupo.motivo)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('hora')
                                .setLabel('Hora (YYYY-MM-DD HH:mm)')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Ej: 2026-01-12 21:00')
                                .setValue(horaTexto || '')
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('descripcion')
                                .setLabel('Descripción')
                                .setStyle(TextInputStyle.Paragraph)
                                .setMaxLength(1000)
                                .setValue(grupo.descripcion)
                        )
                    );
                return interaction.showModal(modal);
            }

            if (interaction.customId === 'party_add') {
                if (!isOwner) return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });

                const espacio = Math.max(0, grupo.max - grupo.miembros.length);
                if (espacio === 0) {
                    return interaction.reply({ content: 'No hay cupos disponibles.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }

                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId(`party_add_select:${grupo.mensajeId}`)
                    .setPlaceholder('Selecciona usuarios para agregar')
                    .setMinValues(1)
                    .setMaxValues(Math.min(espacio, 10));

                const row = new ActionRowBuilder().addComponents(userSelect);
                return interaction.reply({ content: 'Elige usuarios para agregar:', components: [row], flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            if (interaction.customId === 'party_kick') {
                if (!isOwner) return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });

                if (grupo.miembros.length === 0) {
                    return interaction.reply({ content: 'No hay miembros para sacar.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }

                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId(`party_kick_select:${grupo.mensajeId}`)
                    .setPlaceholder('Selecciona usuarios para sacar')
                    .setMinValues(1)
                    .setMaxValues(Math.min(grupo.miembros.length, 10));

                const row = new ActionRowBuilder().addComponents(userSelect);
                return interaction.reply({
                    content: 'Elige usuarios para sacar:',
                    components: [row],
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }
        }

        // ------- UserSelect menu para agregar miembros -------
        if (interaction.isUserSelectMenu && interaction.isUserSelectMenu() && interaction.customId.startsWith('party_add_select:')) {
            const partyMsgId = interaction.customId.split(':')[1];
            grupo = gruposActivos.get(partyMsgId);
            if (!grupo) return interaction.reply({ content: 'Este grupo ya no está activo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            if (interaction.user.id !== grupo.creador.id) {
                return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            const espacio = Math.max(0, grupo.max - grupo.miembros.length);
            if (espacio === 0) {
                return interaction.update({ components: [] }).catch(() => { });
            }

            const ids = interaction.values ?? [];
            const nuevos = ids.filter(id => !grupo.miembros.some(m => m.id === id)).slice(0, espacio);
            for (const id of nuevos) {
                const member = interaction.guild?.members?.cache?.get(id);
                const tag = member?.user?.username ?? id;
                grupo.miembros.push({ id, tag });
            }
            savePartys();

            await interaction.update({ components: [] }).catch(() => { });
            await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
            await interaction.followUp({ content: `Agregados ${nuevos.length} usuario(s).`, flags: MessageFlags.Ephemeral }).catch(() => { });
            return;
        }

        // ------- UserSelect menu para sacar miembros -------
        if (interaction.isUserSelectMenu && interaction.isUserSelectMenu() && interaction.customId.startsWith('party_kick_select:')) {
            const partyMsgId = interaction.customId.split(':')[1];
            grupo = gruposActivos.get(partyMsgId);
            if (!grupo) return interaction.reply({ content: 'Este grupo ya no está activo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            if (interaction.user.id !== grupo.creador.id) {
                return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            const ids = interaction.values ?? [];
            const antes = grupo.miembros.length;

            grupo.miembros = grupo.miembros.filter(m => !ids.includes(m.id));
            const removidos = antes - grupo.miembros.length;

            savePartys();

            await interaction.update({ components: [] }).catch(() => { });
            await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
            await interaction.followUp({ content: `Sacados ${removidos} usuario(s).`, flags: MessageFlags.Ephemeral }).catch(() => { });
            return;
        }

        // ------- Modal submit para editar party (MODIFICADO: actualiza horario) -------
        if (interaction.isModalSubmit?.()) {
            if (interaction.customId === `party_modal_${grupo.mensajeId}`) {
                if (interaction.user.id !== grupo.creador.id) {
                    return interaction.reply({ content: 'Solo el creador puede hacer esto.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }

                const nuevoMotivo = (interaction.fields.getTextInputValue('motivo') ?? '').slice(0, 100) || grupo.motivo;
                const nuevaDesc = (interaction.fields.getTextInputValue('descripcion') ?? '').slice(0, 1000) || grupo.descripcion;
                const horaRaw = (interaction.fields.getTextInputValue('hora') ?? '').trim();

                if (horaRaw) {
                    const d = parseLocalYYYYMMDDHHmm(horaRaw);
                    if (!d) {
                        return interaction.reply({
                            content: 'Formato de fecha/hora inválido. Usa YYYY-MM-DD HH:mm (ej: 2026-01-12 21:00)',
                            flags: MessageFlags.Ephemeral
                        }).catch(() => { });
                    }
                    grupo.hora = Math.floor(d.getTime() / 1000);
                }

                grupo.motivo = nuevoMotivo;
                grupo.descripcion = nuevaDesc;

                savePartys();

                await interaction.reply({ content: 'Party actualizada.', flags: MessageFlags.Ephemeral }).catch(() => { });
                await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
                return;
            }
        }
    },

    async renderGrupo(interaction, grupo, msgEphemeral) {
        const inscritos = grupo.miembros.length;
        const lista = inscritos
            ? grupo.miembros.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n')
            : '—\nAún no hay inscritos.\n—';

        let autorNombre = grupo.creador.username || 'Desconocido';
        let autorIcon = null;
        try {
            let userObj = null;
            if (interaction.guild) {
                userObj = await interaction.guild.members.fetch(grupo.creador.id)
                    .then(m => m.user)
                    .catch(() => null);
            }
            if (!userObj && interaction.client) {
                userObj = await interaction.client.users.fetch(grupo.creador.id).catch(() => null);
            }
            if (userObj) autorIcon = userObj.displayAvatarURL();
        } catch { }

        const horarioField = grupo.hora
            ? { name: 'Horario', value: `<t:${grupo.hora}:F> (<t:${grupo.hora}:R>)`, inline: false }
            : null;

        const fields = [
            { name: 'Descripción', value: `\`\`\`\n${grupo.descripcion}\n\`\`\``, inline: false },
            ...(horarioField ? [horarioField] : []),
            { name: '', value: '*El horario mostrado se ajusta automáticamente a tu zona horaria.*', inline: false },
            { name: `Miembros (${inscritos}/${grupo.max})`, value: lista, inline: false }
        ];

        const embed = new EmbedBuilder()
            .setColor(grupo.color)
            .setAuthor({ name: `Grupo creado por ${autorNombre}`, iconURL: autorIcon || undefined })
            .setTitle(`⚔️ ¡Nuevo grupo: ${grupo.motivo}!`)
            .setDescription('Únete con el botón verde o sal con el rojo.')
            .addFields(fields)
            .setImage('https://cdn.discordapp.com/attachments/639904843888197674/1430404685637881957/b25dece51f820240925155420996.png')
            .setFooter({ text: `Cupos: ${inscritos}/${grupo.max}` })
            .setTimestamp();

        const joinBtn = new ButtonBuilder().setCustomId('party_join').setLabel('Unirme').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(inscritos >= grupo.max);
        const leaveBtn = new ButtonBuilder().setCustomId('party_leave').setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger);
        const editBtn = new ButtonBuilder().setCustomId('party_edit').setLabel('Editar').setStyle(ButtonStyle.Secondary);
        const addBtn = new ButtonBuilder().setCustomId('party_add').setLabel('Agregar a la Party').setStyle(ButtonStyle.Secondary);
        const kickBtn = new ButtonBuilder().setCustomId('party_kick').setLabel('Eliminar de la Party').setStyle(ButtonStyle.Secondary);

        const rowMain = new ActionRowBuilder().addComponents(joinBtn, leaveBtn);
        const rowManage = new ActionRowBuilder().addComponents(editBtn, addBtn, kickBtn);

        await interaction.message.edit({ embeds: [embed], components: [rowMain, rowManage] }).catch(() => { });
        if (msgEphemeral) {
            try {
                if (interaction.replied || interaction.deferred) await interaction.followUp({ content: msgEphemeral, flags: MessageFlags.Ephemeral });
                else await interaction.reply({ content: msgEphemeral, flags: MessageFlags.Ephemeral });
            } catch { }
        }
    },

    async renderGrupoFromMessageId(interaction, grupo) {
        const channel = interaction.channel;
        if (!channel) return;
        const message = await channel.messages.fetch(grupo.mensajeId).catch(() => null);
        if (!message) return;

        const inscritos = grupo.miembros.length;
        const lista = inscritos
            ? grupo.miembros.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n')
            : '—\nAún no hay inscritos.\n—';

        let autorNombre = grupo.creador.username || 'Desconocido';
        let autorIcon = null;
        try {
            let userObj = null;
            if (interaction.guild) {
                userObj = await interaction.guild.members.fetch(grupo.creador.id)
                    .then(m => m.user)
                    .catch(() => null);
            }
            if (!userObj && interaction.client) {
                userObj = await interaction.client.users.fetch(grupo.creador.id).catch(() => null);
            }
            if (userObj) autorIcon = userObj.displayAvatarURL();
        } catch { }

        const horarioField = grupo.hora
            ? { name: 'Horario', value: `<t:${grupo.hora}:F> (<t:${grupo.hora}:R>)`, inline: false }
            : null;

        const fields = [
            { name: 'Descripción', value: `\`\`\`\n${grupo.descripcion}\n\`\`\``, inline: false },
            ...(horarioField ? [horarioField] : []),
            { name: '', value: '*El horario mostrado se ajusta automáticamente a tu zona horaria.*', inline: false },
            { name: `Miembros (${inscritos}/${grupo.max})`, value: lista, inline: false }
        ];

        const embed = new EmbedBuilder()
            .setColor(grupo.color)
            .setAuthor({ name: `Grupo creado por ${autorNombre}`, iconURL: autorIcon || undefined })
            .setTitle(`⚔️ ¡Nuevo grupo: ${grupo.motivo}!`)
            .setDescription('Únete con el botón verde o sal con el rojo.')
            .addFields(fields)
            .setImage('https://cdn.discordapp.com/attachments/639904843888197674/1430404685637881957/b25dece51f820240925155420996.png')
            .setFooter({ text: `Cupos: ${inscritos}/${grupo.max}` })
            .setTimestamp();

        const joinBtn = new ButtonBuilder().setCustomId('party_join').setLabel('Unirme').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(inscritos >= grupo.max);
        const leaveBtn = new ButtonBuilder().setCustomId('party_leave').setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger);
        const editBtn = new ButtonBuilder().setCustomId('party_edit').setLabel('Editar').setStyle(ButtonStyle.Secondary);
        const addBtn = new ButtonBuilder().setCustomId('party_add').setLabel('Agregar a la Party').setStyle(ButtonStyle.Secondary);
        const kickBtn = new ButtonBuilder().setCustomId('party_kick').setLabel('Eliminar de la Party').setStyle(ButtonStyle.Secondary);

        const rowMain = new ActionRowBuilder().addComponents(joinBtn, leaveBtn);
        const rowManage = new ActionRowBuilder().addComponents(editBtn, addBtn, kickBtn);

        await message.edit({ embeds: [embed], components: [rowMain, rowManage] }).catch(() => { });
    }
};
