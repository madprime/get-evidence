// -*- mode: java; c-basic-offset: 4; tab-width: 8; indent-tabs-mode: nil; -*-
// Copyright: see COPYING
// Authors: see git-blame(1)

var bionotate_schema_xml = '<?xml version="1.0" ?><schema><entities><entity><name>gene</name><caption>GENE</caption><nOccurrences>0</nOccurrences><color>1</color><description>continuous, minimal chunk of text identifying a gene</description></entity><entity><name>variant</name><caption>VARIANT</caption><nOccurrences>0</nOccurrences><color>2</color><description>continuous, minimal chunk of text identifying a variant</description></entity><entity><name>phenotype</name><caption>PHENOTYPE</caption><nOccurrences>0</nOccurrences><color>3</color><description>continuous, minimal chunk of text identifying a disease phenotype</description></entity><entity><name>computational-evidence</name><caption>COMPUTATIONAL EVIDENCE</caption><nOccurrences>0</nOccurrences><color>4</color><description>protein structure modeling, evolutionary conservation, etc.</description></entity><entity><name>functional-evidence</name><caption>FUNCTIONAL EVIDENCE</caption><nOccurrences>0</nOccurrences><color>5</color><description>expression in recombinant cell lines, animal model, etc.</description></entity><entity><name>case-control-evidence</name><caption>CASE/CONTROL EVIDENCE</caption><nOccurrences>0</nOccurrences><color>6</color><description>observation of variant incidence in a set of cases, may also include controls</description></entity><entity><name>familial-evidence</name><caption>FAMILIAL EVIDENCE</caption><nOccurrences>0</nOccurrences><color>7</color><description>pedigree information, familial inheritance</description></entity><entity><name>sporadic-evidence</name><caption>SPORADIC OBSERVATION</caption><nOccurrences>0</nOccurrences><color>8</color><description>Sporadic observation containing neither case/control nor familial information</description></entity></entities><questions><question><id>variance-disease-relation</id><text>What is the paper\'s conclusion regarding the variant\'s relationship with the disease/phenotype you highlighted?</text><answers><answer><value>causality</value><text> Causes the disease/phenotype</text><required></required></answer><answer><value>positive-association</value><text> Is positively associated with the disease/phenotype (exacerbating modifier effect or increased susceptibility)</text><required></required></answer><answer><value>uncertain-association</value><text> May be associated with the disease/phenotype (unknown significance) </text><required></required></answer><answer><value>unrelated-association</value><text> Is not associated with the disease/phenotype (benign polymorphism or effect is unrelated)</text><required></required></answer><answer><value>negative-association</value><text> Is negatively associated with the disease/phenotype (protective effect or decreased susceptibility)</text><required></required></answer><answer><value>other</value><text> Don\'t know / Can\'t tell / Other</text><required></required></answer></answers></question></questions></schema>';

(function($){
    $(function(){
            var schema = $.parseXML (bionotate_schema_xml);
            var $schema = $(schema);

            var bionotate_color = {};
            $schema.find('schema>entities>entity').each(function(i,e){
                    bionotate_color[$(e).find('name').text()] = $(e).find('color').text();
                });

            $('.bionotate-button').button().click(function(e){
                    var $form = $('form.bionotate-form');
                    var $div = $(e.target).parents('div[bnkey]');
                    var bnkey = $div.attr('bnkey');
                    var variant_id = $div.attr('variant_id');
                    var article_pmid = $div.attr('article_pmid');
                    $form.find('input[name=oid]').attr('value',$div.attr('oid'));
                    $form.find('input[name=oidcookie]').attr('value',$div.attr('oidcookie'));
                    $form.find('input[name=variant_id]').attr('value',variant_id);
                    $form.find('input[name=article_pmid]').attr('value',article_pmid);
                    $form.find('input[name=xml]').attr('value',$div.attr('snippet_xml'));
                    $form.find('input[name=save_to_url]').attr('value',document.location.href.replace(/([^\/])\/([^\/].*)?$/, '$1/bionotate-save.php?variant_id='+variant_id+'&article_pmid='+article_pmid));
                    $form.attr('action', 'http://bionotate.biotektools.org/GET-Evidence/xml/'+bnkey);
                    $form.submit();
                    return false;
                });
            $('.bionotate').bind('bionotate-render', function(event, data){
                    var div = this;
                    var bnkey = $(div).attr('bnkey');
                    var xml;
                    var $annot;
                    var text;
                    var annots = [];
                    var transitions = [];
                    var current_colors = {};
                    var n_colors = 0;
                    var i;
                    var annot, startword, startchar, stopword, stopchar;
                    var tword, tchar, tcolor, ttype;
                    var spancolor;

                    if (data && data.xml)
                        xml = data.xml;
                    else if ($(div).hasClass('bionotate_visible'))
                        // Already rendered.
                        return;
                    else if (!($(div).attr('snippet_xml')))
                        // No xml.
                        return;
                    else
                        xml = $(div).attr('snippet_xml');
                    try {
                        $annot = $($.parseXML (xml));
                    } catch (e) {
                        console.log ('Failed to parse XML');
                        console.log (e);
                        return;
                    }
                    text = $annot.find('feed text').text();
                    $annot.find('annotations entry').each(function(i,e){
                            var $e = $(e);
                            var annot = $e.find('range').text().split(' ');
                            annot.summary = $e.find('summary').text();
                            annot.type = $e.find('type').text();
                            annots.push(annot);
                        });
                    annots.sort(function(a,b){return b[0]-a[0]});
                    for(i=0; i<annots.length; i++) {
                        annot = annots[i];
                        startword = annot[0].split('.')[0]-1;
                        startchar = annot[0].split('.')[1]-0;
                        stopword = annot[1].split('.')[0]-1;
                        stopchar = annot[1].split('.')[1]-0;
                        transitions.push([startword, startchar, bionotate_color[annot.type], 'start'],
                                         [stopword, stopchar, bionotate_color[annot.type], 'stop']);
                    }
                    transitions.sort(function(a,b){
                            return (a[0]==b[0] ? a[1]-b[1] : a[0]-b[0]);
                        });
                    for (i=transitions.length-1; i>=0; i--) {
                        tword = transitions[i][0];
                        tchar = transitions[i][1];
                        tcolor = transitions[i][2];
                        ttype = transitions[i][3];
                        var insertme;

                        if (ttype == 'start' && n_colors == 1)
                            insertme = '<span color="'+tcolor+'">';
                        else if (n_colors % 2 == 1) {
                            spancolor = 'multi';
                            if (ttype == 'stop') {
                                // tcolor is the color that is
                                // obscuring the desired color to the
                                // left of point -- the span tag needs
                                // the color that has just been freed
                                // up.
                                for(var c in current_colors) {
                                    if (current_colors[c] > 0 && tcolor != c) {
                                        spancolor = c;
                                        break;
                                    }
                                }
                            }
                            else
                                spancolor = tcolor;
                            insertme = '</span><span color="'+spancolor+'">';
                        }
                        else if (ttype == 'stop' && n_colors == 0)
                            insertme = '</span>';
                        else
                            insertme = '</span><span color="multi">';

                        var tre = new RegExp ('^((\\S+\\s+){'+tword+'}\\S{'+tchar+'})');
                        var text_new = text.replace(tre, '$1'+insertme);
                        if (text_new != text) {
                            text = text_new;
                            if (!current_colors[tcolor])
                                current_colors[tcolor] = 0;
                            current_colors[tcolor] += (ttype == 'stop' ? 1 : -1);
                            n_colors += (ttype == 'start' ? -1 : 1);
                        }
                    }
                    var conclusion = $annot.find('question id:contains(variance-disease-relation)').parent().find('answer').text();
                    if (!conclusion) conclusion = 'other';
                    var conclusion_text = $(schema).find('question:contains(variance-disease-relation)').find('answers answer:contains("'+conclusion+'")').find('text').text();
                    $(div).html('<span><p>'+text+'</p><p>&nbsp;<br />Variant/disease relation: <b>'+conclusion_text+'</b></p></span>');
                    $(div).addClass('bionotate_visible').show();
                });
            $('body').append('<form class="bionotate-form" action="#" method="POST"><input type="hidden" name="oid" value=""/><input type="hidden" name="oidcookie" value=""/><input type="hidden" name="xml" value=""/><input type="hidden" name="variant_id" value=""/><input type="hidden" name="article_pmid" value=""/><input type="hidden" name="save_to_url" value=""/></form>');

            $('.bionotate').each(function(i,div){$(div).trigger('bionotate-render')});
        });
})(jQuery);
