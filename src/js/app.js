import $ from 'jquery';
import { parseCode } from './code-analyzer';
import {traverse} from './code-analyzer';
import {input_vector} from './code-analyzer';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        
        let parsedCode = traverse(parseCode(codeToParse));
        $('#parsedCode').html(parsedCode);
    });

    $('#codeSubmissionParams').click(() => {
        let param_name = $('#Param_name').val();
        let param_value = $('#Param_value').val();
        input_vector.set(param_name, param_value);
        $('#Param_name').val("");
        $('#Param_value').val("");
    });
}

);
