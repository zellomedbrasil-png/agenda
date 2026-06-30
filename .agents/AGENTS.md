### Padrão de Design para Sistemas de Agendamento (Inspiração Cal.com)
Quando trabalhar em interfaces de agendamento, calendário ou dashboards administrativos:
- **Estética Minimalista:** Priorize alto contraste para texto e bordas extremamente sutis (`border-gray-200` em modo claro).
- **FullCalendar:** Nunca use o visual padrão do FullCalendar. Substitua a estilização das variáveis CSS nativas do plugin para remover bordas pesadas e usar o padrão de cores do Tailwind.
- **Navegação (Sidebar):** Use fundos transparentes com realce sutil no item ativo (ex: `bg-muted` ou cinza muito claro), sem cores primárias fortes para o menu.
- **Micro-interações:** Adicione estados de `hover` suaves e transições em todos os botões e cards de evento.
- **Acessibilidade e Whitespace:** Use bastante respiro (padding) nos contêineres principais (ex: `p-8` em vez de `p-4`) e priorize fontes sem-serifa limpas.
