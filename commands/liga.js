const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    UserSelectMenuBuilder, MessageFlags
} = require('discord.js');

module.exports = {
    data: {
        name: 'liga',
        description: 'Crear y manejar un escuadron para la liga de gremios',
        options: [
            {
                name: 'dia',
                type: 3,
                description: 'Dia de la liga (sin sabado)',
                required: true,
                choices: [
                    { name: 'Domingo', value: '0' },
                    { name: 'Lunes', value: '1' },
                    { name: 'Martes', value: '2' },
                    { name: 'Miércoles', value: '3' },
                    { name: 'Jueves', value: '4' },
                    { name: 'Viernes', value: '5' }
                ]
            },
            {
                name: 'hora',
                type: 3,
                description: 'Hora de inicio (HH:mm, Ej: 21:00)',
                required: true,
            }
        ],
    },

    async execute(interaction, gruposActivos, savePartys, client) {
        const motivo = 'Liga de Gremios';
        const diaStr = interaction.options.getString('dia');
        const horaStr = interaction.options.getString('hora');
        const tamano = 10;
        const color = 0xFFD700;
        const creador = interaction.user;

        const diasTexto = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const targetDow = parseInt(diaStr, 10);
        const diaNombre = diasTexto[targetDow] ?? 'Dia';

        // --- CÁLCULO DE FECHA Y HORA ---
        const now = new Date();
        const dowNow = now.getDay();
        let diff = (targetDow - dowNow + 7) % 7;
        let targetDate = new Date(
            now.getFullYear(), now.getMonth(), now.getDate() + diff
        );

        // Parsear la hora (HH:mm)
        const horaRegex = /^(\d{1,2}):(\d{2})$/;
        const match = horaStr.match(horaRegex);

        if (!match) {
            return interaction.reply({
                content: 'Formato de hora inválido. Usa HH:mm (Ej: 21:00).',
                flags: MessageFlags.Ephemeral
            });
        }

        const targetHour = parseInt(match[1], 10);
        const targetMinute = parseInt(match[2], 10);

        targetDate.setHours(targetHour, targetMinute, 0, 0);

        // Si la fecha objetivo (dia + hora) ya pasó, avanzar una semana.
        if (targetDate.getTime() < now.getTime()) {
            targetDate.setDate(targetDate.getDate() + 7);
        }

        const nodeTs = Math.floor(targetDate.getTime() / 1000);
        // ------------------------------------

        const horarioTexto = `<t:${nodeTs}:F> (<t:${nodeTs}:t>)`;
        const countdownTexto = `<t:${nodeTs}:R>`;

        // Creador se une por defecto
        const miembrosIniciales = [{ id: creador.id, tag: creador.username }];
        const inscritosIniciales = miembrosIniciales.length;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🛡️ LIGA DE GREMIOS 🛡️')
            .setDescription('**¡Escuadrón de Liga de Gremios listo!** Usa el botón **verde** para unirte.')
            .addFields(
                { name: '📅 Dia / Hora', value: horarioTexto, inline: false },
                { name: '⏰ Comienza en', value: countdownTexto, inline: false },
                {
                    name: `👥 Miembros inscritos (${inscritosIniciales}/${tamano})`,
                    value: miembrosIniciales.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n'),
                    inline: false
                }
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/639904843888197674/1446592154158764162/wmremove-transformed.png?ex=69348b6d&is=693339ed&hm=079239cb46d5b75ec89330e36a047989b11e66beae0bfccb9484347652d97228&')
            .setImage('https://s1.pearlcdn.com/KR/Upload/News/13d16a948c720240130203828346.png')
            .setFooter({ text: `Cupos disponibles: ${inscritosIniciales}/${tamano}` })
            .setTimestamp();

        // IDs ACTUALIZADAS DE maritima_ a liga_
        const joinBtn = new ButtonBuilder().setCustomId('liga_join').setLabel('Unirme').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(inscritosIniciales >= tamano);
        const leaveBtn = new ButtonBuilder().setCustomId('liga_leave').setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger);
        const addBtn = new ButtonBuilder().setCustomId('liga_add').setLabel('Agregar').setStyle(ButtonStyle.Primary);
        const removeBtn = new ButtonBuilder().setCustomId('liga_remove').setLabel('Eliminar').setStyle(ButtonStyle.Danger);
        const closeBtn = new ButtonBuilder().setCustomId('liga_close').setLabel('Finalizar Liga').setStyle(ButtonStyle.Secondary);

        const rowTop = new ActionRowBuilder().addComponents(joinBtn, leaveBtn, addBtn, removeBtn, closeBtn);

        await interaction.reply({ embeds: [embed], components: [rowTop] });
        const mensaje = await interaction.fetchReply();

        gruposActivos.set(mensaje.id, {
            miembros: miembrosIniciales,
            motivo,
            dia: targetDow,
            diaNombre,
            nodeTs,
            creador,
            admins: ['527326979209560074', '291312809642295298'],
            mensajeId: mensaje.id,
            color,
            max: tamano
        });
        savePartys();
    },

    async handleInteraction(interaction, gruposActivos, savePartys, client) {
        const customId = interaction.customId || '';

        function getPartyIdFromCustomId(id, prefixes) {
            if (!id) return null;
            for (const p of prefixes) {
                if (id.startsWith(p + ':')) return id.slice(p.length + 1);
            }
            return null;
        }

        function resolveGrupoFromInteraction(interaction) {
            // IDs ACTUALIZADAS
            const idFromCustom = getPartyIdFromCustomId(interaction.customId, ['liga_add_select', 'liga_remove_select']);
            if (idFromCustom && gruposActivos.has(idFromCustom)) return gruposActivos.get(idFromCustom);
            const mid = interaction.message?.id;
            if (mid && gruposActivos.has(mid)) return gruposActivos.get(mid);
            return null;
        }

        let grupo = resolveGrupoFromInteraction(interaction);
        if (!grupo) {
            if (interaction.isRepliable())
                await interaction.reply({ content: 'Este escuadron ya no está activo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            return;
        }

        const isOwner = interaction.user.id === grupo.creador.id || (grupo.admins && grupo.admins.includes(interaction.user.id));

        // BOTONES
        if (interaction.isButton()) {
            const user = interaction.user;

            if (customId === 'liga_join') { // ID ACTUALIZADA
                if (grupo.miembros.some(u => u.id === user.id))
                    return interaction.reply({ content: 'Ya estas en el escuadron.', flags: MessageFlags.Ephemeral }).catch(() => { });
                if (grupo.miembros.length >= grupo.max)
                    return interaction.reply({ content: 'El escuadron ya esta completo.', flags: MessageFlags.Ephemeral }).catch(() => { });

                grupo.miembros.push({ id: user.id, tag: user.username });
                savePartys();
                await this.renderGrupo(interaction, grupo, `${user.username} se unió al escuadrón.`);
                return;
            }
            if (customId === 'liga_leave') { // ID ACTUALIZADA
                if (!grupo.miembros.some(u => u.id === user.id))
                    return interaction.reply({ content: 'No formas parte de este escuadrón.', flags: MessageFlags.Ephemeral }).catch(() => { });

                if (grupo.miembros.length === 1 && user.id === grupo.creador.id) {
                    return interaction.reply({ content: 'El creador no puede salir si es el único miembro.', flags: MessageFlags.Ephemeral }).catch(() => { });
                }

                grupo.miembros = grupo.miembros.filter(u => u.id !== user.id);
                savePartys();
                await this.renderGrupo(interaction, grupo, `${user.username} salió del escuadrón.`);
                return;
            }
            if (customId === 'liga_add') { // ID ACTUALIZADA
                if (!isOwner)
                    return interaction.reply({ content: 'Solo el creador o administradores pueden hacer esto.', flags: MessageFlags.Ephemeral });
                const espacio = Math.max(0, grupo.max - grupo.miembros.length);
                if (espacio === 0)
                    return interaction.reply({ content: 'No hay cupos disponibles.', flags: MessageFlags.Ephemeral }).catch(() => { });

                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId(`liga_add_select:${grupo.mensajeId}`) // ID ACTUALIZADA
                    .setPlaceholder('Selecciona usuarios para agregar')
                    .setMinValues(1)
                    .setMaxValues(Math.min(espacio, 10));
                const row = new ActionRowBuilder().addComponents(userSelect);
                return interaction.reply({ content: 'Elige usuarios para agregar:', components: [row], flags: MessageFlags.Ephemeral }).catch(() => { });
            }
            if (customId === 'liga_remove') { // ID ACTUALIZADA
                if (!isOwner)
                    return interaction.reply({ content: 'Solo el creador o administradores pueden hacer esto.', flags: MessageFlags.Ephemeral });
                if (grupo.miembros.length === 0)
                    return interaction.reply({ content: 'No hay miembros para eliminar.', flags: MessageFlags.Ephemeral }).catch(() => { });

                const espacio = grupo.miembros.length;
                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId(`liga_remove_select:${grupo.mensajeId}`) // ID ACTUALIZADA
                    .setPlaceholder('Selecciona usuarios para eliminar')
                    .setMinValues(1)
                    .setMaxValues(Math.min(espacio, 10));
                const row = new ActionRowBuilder().addComponents(userSelect);
                return interaction.reply({ content: 'Elige usuarios para eliminar:', components: [row], flags: MessageFlags.Ephemeral }).catch(() => { });
            }

            // LÓGICA DE CERRAR LIGA
            if (customId === 'liga_close') { // ID ACTUALIZADA
                if (!isOwner)
                    return interaction.reply({ content: 'Solo el creador o administradores pueden cerrar la Liga.', flags: MessageFlags.Ephemeral });

                // Desactivar botones
                const disabledRowTop = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('liga_join').setLabel('Unirme').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(true), // ID ACTUALIZADA
                    new ButtonBuilder().setCustomId('liga_leave').setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger).setDisabled(true), // ID ACTUALIZADA
                    new ButtonBuilder().setCustomId('liga_add').setLabel('Agregar').setStyle(ButtonStyle.Primary).setDisabled(true), // ID ACTUALIZADA
                    new ButtonBuilder().setCustomId('liga_remove').setLabel('Eliminar').setStyle(ButtonStyle.Danger).setDisabled(true), // ID ACTUALIZADA
                    new ButtonBuilder().setCustomId('liga_close').setLabel('Finalizado').setStyle(ButtonStyle.Secondary).setDisabled(true) // ID ACTUALIZADA
                );

                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setTitle('🔒 LIGA DE GREMIOS FINALIZADA 🔒')
                    .setColor(0x7f8c8d)
                    .setDescription('Este escuadrón de Liga ha sido cerrado.');

                await interaction.message.edit({ embeds: [embed], components: [disabledRowTop] }).catch(() => { });

                gruposActivos.delete(grupo.mensajeId);
                savePartys();

                return interaction.reply({ content: 'Escuadrón de Liga finalizado y eliminado de la lista activa.', flags: MessageFlags.Ephemeral }).catch(() => { });
            }
        }

        // UserSelect para agregar
        if (interaction.isUserSelectMenu && interaction.isUserSelectMenu() && interaction.customId.startsWith('liga_add_select:')) { // ID ACTUALIZADA
            const partyMsgId = interaction.customId.split(':')[1];
            grupo = gruposActivos.get(partyMsgId);
            if (!grupo)
                return interaction.reply({ content: 'Este escuadrón ya no está activo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            if (!isOwner)
                return interaction.reply({ content: 'Solo el creador o administradores pueden hacer esto.', flags: MessageFlags.Ephemeral });

            const espacio = Math.max(0, grupo.max - grupo.miembros.length);
            if (espacio === 0)
                return interaction.update({ components: [] }).catch(() => { });

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

        // UserSelect para eliminar
        if (interaction.isUserSelectMenu && interaction.isUserSelectMenu() && interaction.customId.startsWith('liga_remove_select:')) { // ID ACTUALIZADA
            const partyMsgId = interaction.customId.split(':')[1];
            grupo = gruposActivos.get(partyMsgId);
            if (!grupo)
                return interaction.reply({ content: 'Este escuadrón ya no está activo.', flags: MessageFlags.Ephemeral }).catch(() => { });
            if (!isOwner)
                return interaction.reply({ content: 'Solo el creador o administradores pueden hacer esto.', flags: MessageFlags.Ephemeral });

            const ids = interaction.values ?? [];
            grupo.miembros = grupo.miembros.filter(u => !ids.includes(u.id));
            savePartys();

            await interaction.update({ components: [] }).catch(() => { });
            await this.renderGrupoFromMessageId(interaction, grupo).catch(() => { });
            await interaction.followUp({ content: `Eliminados ${ids.length} miembro(s).`, flags: MessageFlags.Ephemeral }).catch(() => { });
            return;
        }
    },

    async renderGrupo(interaction, grupo, msgEphemeral) {
        const inscritos = grupo.miembros.length;

        // La lista ahora solo muestra a todos los inscritos
        const listaInscritos = inscritos
            ? grupo.miembros.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n')
            : '— Aún no hay inscritos —';

        const horarioTexto = `<t:${grupo.nodeTs}:F> (<t:${grupo.nodeTs}:t>)`;
        const countdownTexto = `<t:${grupo.nodeTs}:R>`;

        const embed = new EmbedBuilder()
            .setColor(grupo.color)
            .setTitle('🛡️ LIGA DE GREMIOS 🛡️')
            .setDescription('**¡Escuadrón de Liga de Gremios listo!** Usa el botón **verde** para unirte.')
            .addFields(
                { name: '📅 Dia / Hora', value: horarioTexto, inline: false },
                { name: '⏰ Comienza en', value: countdownTexto, inline: false },
                { name: `👥 Miembros inscritos (${inscritos}/${grupo.max})`, value: listaInscritos, inline: false },
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/639904843888197674/1446592154158764162/wmremove-transformed.png?ex=69348b6d&is=693339ed&hm=079239cb46d5b75ec89330e36a047989b11e66beae0bfccb9484347652d97228&')
            .setImage('https://s1.pearlcdn.com/KR/Upload/News/13d16a948c720240130203828346.png')
            .setFooter({ text: `Cupos: ${inscritos}/${grupo.max}` })
            .setTimestamp();

        // IDs ACTUALIZADAS
        const joinBtn = new ButtonBuilder().setCustomId('liga_join').setLabel('Unirme').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(inscritos >= grupo.max);
        const leaveBtn = new ButtonBuilder().setCustomId('liga_leave').setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger);
        const addBtn = new ButtonBuilder().setCustomId('liga_add').setLabel('Agregar').setStyle(ButtonStyle.Primary);
        const removeBtn = new ButtonBuilder().setCustomId('liga_remove').setLabel('Eliminar').setStyle(ButtonStyle.Danger);
        const closeBtn = new ButtonBuilder().setCustomId('liga_close').setLabel('Finalizar Liga').setStyle(ButtonStyle.Secondary);

        const rowTop = new ActionRowBuilder().addComponents(joinBtn, leaveBtn, addBtn, removeBtn, closeBtn);

        await interaction.message.edit({ embeds: [embed], components: [rowTop] }).catch(() => { });
        if (msgEphemeral) {
            try {
                if (interaction.replied || interaction.deferred)
                    await interaction.followUp({ content: msgEphemeral, flags: MessageFlags.Ephemeral });
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

        // La lista ahora solo muestra a todos los inscritos
        const listaInscritos = inscritos
            ? grupo.miembros.map((u, i) => `**${i + 1}.** <@${u.id}>`).join('\n')
            : '— Aún no hay inscritos —';

        const horarioTexto = `<t:${grupo.nodeTs}:F> (<t:${grupo.nodeTs}:t>)`;
        const countdownTexto = `<t:${grupo.nodeTs}:R>`;

        const embed = new EmbedBuilder()
            .setColor(grupo.color)
            .setTitle('🛡️ LIGA DE GREMIOS 🛡️')
            .setDescription('**¡Escuadrón de Liga de Gremios listo!** Usa el botón **verde** para unirte.')
            .addFields(
                { name: '📅 Dia / Hora', value: horarioTexto, inline: false },
                { name: '⏰ Comienza en', value: countdownTexto, inline: false },
                { name: `👥 Miembros inscritos (${inscritos}/${grupo.max})`, value: listaInscritos, inline: false }
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/639904843888197674/1446592154158764162/wmremove-transformed.png?ex=69348b6d&is=693339ed&hm=079239cb46d5b75ec89330e36a047989b11e66beae0bfccb9484347652d97228&')
            .setImage('https://s1.pearlcdn.com/KR/Upload/News/13d16a948c720240130203828346.png')
            .setFooter({ text: `Cupos: ${inscritos}/${grupo.max}` })
            .setTimestamp();

        // IDs ACTUALIZADAS
        const joinBtn = new ButtonBuilder().setCustomId('liga_join').setLabel('Unirme').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(inscritos >= grupo.max);
        const leaveBtn = new ButtonBuilder().setCustomId('liga_leave').setLabel('Salir').setEmoji('🚫').setStyle(ButtonStyle.Danger);
        const addBtn = new ButtonBuilder().setCustomId('liga_add').setLabel('Agregar').setStyle(ButtonStyle.Primary);
        const removeBtn = new ButtonBuilder().setCustomId('liga_remove').setLabel('Eliminar').setStyle(ButtonStyle.Danger);
        const closeBtn = new ButtonBuilder().setCustomId('liga_close').setLabel('Finalizar Liga').setStyle(ButtonStyle.Secondary);

        const rowTop = new ActionRowBuilder().addComponents(joinBtn, leaveBtn, addBtn, removeBtn, closeBtn);

        await message.edit({ embeds: [embed], components: [rowTop] }).catch(() => { });
    }
};