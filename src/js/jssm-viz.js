
const viz = jssm => {

  const l_states = jssm.states();

  const node_of  = state => `n${l_states.indexOf(state)}`,
        vc       = col   => (jssm._viz_colors:any)[col] || '';

  const nodes : string = l_states.map( (s:any) => {

    const this_state = jssm.state_for(s),
          terminal   = jssm.state_is_terminal(s),
          final      = jssm.state_is_final(s),
          complete   = jssm.state_is_complete(s),
          features   = [
                        ['label',       s],
                        ['peripheries', complete? 2 : 1  ],
                        ['fillcolor',   final   ? vc('fill_final')    :
                                       (complete? vc('fill_complete') :
                                       (terminal? vc('fill_terminal') :
                                                  '')) ]
                       ]
                        .filter(r => r[1])
                        .map(   r => `${r[0]}="${r[1]}"`)
                        .join(' ');
    return `${node_of(s)} [${features}];`;

  }).join(' ');

  const strike = [];
  const edges  = jssm.states().map( (s:any) =>

    jssm.list_exits(s).map( (ex:any) => {

      if ( strike.find(row => (row[0] === s) && (row[1] == ex) ) ) {
          return '';  // already did the pair
      }

      const edge         = jssm.list_transitions(s, ex),
            pair         = jssm.list_transitions(ex, s),
            double       = pair && (s !== ex),

            head_state   = jssm.state_for(s),
            tail_state   = jssm.state_for(ex),

//          label        = edge  ? ([edge.name?`${(edge.name:any)}`:undefined,`${(edge.probability:any)}`]
//                                 .filter(not_undef => !!not_undef)
//                                   .join('\n') || undefined
//                                  ) : undefined,

            if_obj_field = (obj:any, field) => obj? (obj[field] || '') : '',

            h_final      = jssm.state_is_final(s),
            h_complete   = jssm.state_is_complete(s),
            h_terminal   = jssm.state_is_terminal(s),

            t_final      = jssm.state_is_final(ex),
            t_complete   = jssm.state_is_complete(ex),
            t_terminal   = jssm.state_is_terminal(ex),

            lineColor    = (final, complete, terminal, _solo_1_2 = '_solo') =>
                             final   ? (vc('line_final'    + _solo_1_2)) :
                            (complete? (vc('line_complete' + _solo_1_2)) :
                            (terminal? (vc('line_terminal' + _solo_1_2)) :
                                        vc('normal_line'   + _solo_1_2))),

            textColor    = (final, complete, terminal, _solo_1_2 = '_solo') : string =>
                             final   ? (vc('text_final'    + _solo_1_2)) :
                            (complete? (vc('text_complete' + _solo_1_2)) :
                            (terminal? (vc('text_terminal' + _solo_1_2)) :
                                       '')),

            headColor    = textColor(h_final, h_complete, h_terminal, double? '_1' : '_solo'),
            tailColor    = textColor(t_final, t_complete, t_terminal, double? '_2' : '_solo'),

            labelInline  = [
//                           [edge, 'name',        'label',     true],
                             [pair, 'probability', 'headlabel', 'name', 'action', double, headColor],
                             [edge, 'probability', 'taillabel', 'name', 'action', true,   tailColor]
                           ]
                           .map(    r       => ({ which: r[2], whether: (r[5]? ([(if_obj_field(r[0], r[5]):any), (if_obj_field(r[0], r[1]):any), (if_obj_field(r[0], r[3]):any)].filter(q=>q).join('<br/>') || '') : ''), color: r[6] }) )
                           .filter( present => present.whether )
                           .map(    r       => `${r.which}=${(r.color)? `<<font color="${(r.color:any)}">${(r.whether : any)}</font>>` : `"${(r.whether : any)}"`};`)
                           .join(' '),

            tc1          = lineColor(t_final, t_complete, t_terminal, '_1'),
            tc2          = lineColor(h_final, h_complete, h_terminal, '_2'),
            tcd          = lineColor(t_final, t_complete, t_terminal, '_solo'),

            edgeInline   = edge  ? (double? `dir=both;color="${tc1}:${tc2}"` : `color="${tcd}"`) : '';

      if (pair) { strike.push([ex, s]); }

      return `${node_of(s)}->${node_of(ex)} [${labelInline}${edgeInline}];`;

    }).join(' ')

  ).join(' ');

  return `digraph G {\n  fontname="helvetica neue";\n  style=filled;\n  bgcolor=lightgrey;\n  node [fontsize=14; shape=box; style=filled; fillcolor=white; fontname="helvetica neue"];\n  edge [fontsize=6;fontname="helvetica neue"];\n\n  ${nodes}\n\n  ${edges}\n}`;

}





export { viz };
