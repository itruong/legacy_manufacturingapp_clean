
//prevent submit on enter
document.getElementById("form").onkeypress = function(e){
    var key = e.charCode || e.keyCode || 0;
    if(key == 13){
        e.preventDefault();
    }
}

//-----------functions-----------//

/*
Preconditions: requires that input field id is in the form of id_[prefix]-[0-9]+-[suffix]_[0-9]+
*/
function attachDatalists(className){
    var inputs = document.getElementsByClassName(className);
    for(var i=0;i<inputs.length;i++){
        var endnum = inputs[i].id.match(/-[0-9]+-/g)[0];
        endnum = endnum.substring(0, endnum.length-1);
        inputs[i].setAttribute('list', 'oplist'+endnum)
    }
}
function calcDailyLab(id, dec, totName, formsetlist){
    var sum = 0;
    var components = getIdComponents(id);
    formsetlist.forEach(function (formPref){
        var numForms = document.getElementById(components['start'] + formPref + "-" + "TOTAL_FORMS").value;
        for(var i=0;i<numForms;i++){
            var value = parseFloat(document.getElementById(components['start'] + formPref + "-" + i + components['suf'] + components['index']).value);
            if(!isNaN(value))
                sum+=value;
        }
    });
    sum = round(sum, dec);
    var tot = document.getElementsByName(totName)[components['index']];
    tot.innerHTML = sum;
    calcWeeklyLab(dec, totName);
}
function calcDailyLabInit(id, dec, totName, formsetlist){
    var cols = document.getElementsByName(totName).length;
    var components = getIdComponents(id);
    for(var i=0;i<cols;i++){
        calcDailyLab(components['start'] + components['pref'] + "-" + components['formIndex'] + components['suf'] + i.toString(), dec, totName, formsetlist);
    }
}
function calcTotLab(id, dec, totStr){//id_form-0-tal_0
    //console.log("%s, %d, %d, %s", str, strlen, dec, end);
    var days = 7;
    var sum=0;
    var components = getIdComponents(id);
    var istart = components['index'] - (components['index'] % days);
    for(var i=istart;i<istart+days;i++){
        var f = parseFloat(document.getElementById(components['start'] + components['pref'] + "-" + components['formIndex'] + components['suf'] +i.toString()).value);
        if(!isNaN(f))
            sum+=f;
    }
    sum = round(sum, dec);
    var tot = document.getElementById(components['pref'] + totStr + components['formIndex']);//ta_tq0
    tot.innerHTML=sum;
}
function calcWeeklyLab(dec, totName){
    var totals = document.getElementsByName(totName);
    var sum = 0;
    for(var i=0;i<totals.length;i++){
        var val = parseFloat(totals[i].innerHTML);
        if(!isNaN(val))
        sum += val;
    }
    sum = round(sum, dec)
    var tot = document.getElementsByName(totName+"Tot")[0];
    tot.innerHTML = sum;
}
/*
Preconditions: ex. ("id_form-0-tal_0", "tal_0", 1, "h")
*/
function calcTotLabInit(id, dec, totStr){
    var components = getIdComponents(id);
    var endStr = "TOTAL_FORMS"
    var numForms = document.getElementById(components['start'] + components['pref'] + "-" + endStr).value;
    for(var i=0;i<numForms;i++){
        calcTotLab(components['start'] + components['pref'] + "-" + i + components['suf'] + '0', dec, totStr)
    }
}
function disabled(name){
    var nav = document.querySelector('[class=nav-link]');
    nav.innerHTML = name;
    nav.href = '#';
    document.querySelector('[class=divBody]').querySelectorAll('a').forEach(function(a){
        a.href = 'javascript:';
        a.onclick = 'javascript:';
    });
    document.querySelectorAll('input').forEach(function(input){
        input.disabled = true;
    });
    document.querySelectorAll('textarea').forEach(function(input){
        input.disabled = true;
    });
}
function fillDatalist(fields, datalist){
    fields.forEach(function(field){
        var opt = document.createElement("option");
        opt.value = field;
        datalist.appendChild(opt);
    });
}
function getDateSun(date){
    if (date.getFullYear() < 2000){
        date.setFullYear(date.getFullYear() + 100)
    }
    var n = date.getDay();
    var sunDate = new Date(date.getTime())
    sunDate.setDate(sunDate.getDate() - n);
    return sunDate; 
}
function getIdComponents(id){
    var components = {};
    components['start'] = "id_"
    var pref = id.match(/_[A-z]+-/g)[0];
    pref = pref.substring(1, pref.length-1);
    components['pref'] = pref;
    var formIndex = id.match(/-[0-9]+-/g)[0]
    formIndex = formIndex.substring(1, formIndex.length-1);
    components['formIndex'] = formIndex;
    components['suf'] = id.match(/-[A-z]+_/g)[0];
    components['index'] = parseInt(id.substring(id.length-1));//0
    return components;
}
function handleXHRError(){
    showError('Could not connect to the server. Your data has not been saved.')
}
function insertAfter(newNode, referenceNode){
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}
function pad(dig, num){
    var str = "000" + num;
    return str.substr(str.length-dig);
}
function round(val, dec){
    var m = Math.pow(10, dec || 0);
    return Math.round(val*m)/m;
}
function showDesc(id, task){
    var descDivs = document.getElementsByName("taskdesc[]");
    descDivs[parseInt(id.charAt(11))].innerHTML = tasks[task][2];
}
function showDateLabels(name, strdate){
    var tableCells = document.getElementsByName(name);
    var date = new Date(strdate.replace(/-/g, '\/'));
    var index = 0;
    if(!isNaN(date)){
        var sunDate = getDateSun(date);
        for(var i=0;i<tableCells.length;i++){//could not use for-in... does it create a copy?
            if(index>=7)
                index = 0;
            var iterDate = new Date(sunDate.getTime());
            iterDate.setDate(sunDate.getDate()+index);
            var str = iterDate.toLocaleDateString("en-US") + "<br>" + iterDate.toString().substr(0,3)+"<br>";
            tableCells[i].innerHTML = str;
            index++;
        }
    }
}
function showCols(name, str){
    var tableCells = document.getElementsByName(name);
    for(var i=0;i<tableCells.length;i++){//could not use for-in... does it create a copy?
        tableCells[i].innerHTML = tableCells[i].innerHTML + str;
    }
}
function showError(text){
    var modal = document.getElementById('modal');
    var span = document.getElementsByClassName('close')[0];
    modal.querySelector('p').innerHTML = text;
    modal.style.display = "block";
    span.onclick = function(){
        modal.style.display = "none";
    }
    window.onclick = function(event){
        if(event.target == modal){
            modal.style.display = "none";
        }
    }
}
function showQtyHrsCols(name){
    var tableCells = document.getElementsByName(name);
    for(var i=0;i<tableCells.length;i++){//could not use for-in... does it create a copy?
        var divQ = document.createElement("div");
        divQ.innerHTML = "Qty";
        divQ.setAttribute("class", "splitcellL");
        var divH = document.createElement("div");
        divH.innerHTML = "Hrs";
        divH.setAttribute("class", "splitcellR");
        tableCells[i].appendChild(divQ);
        tableCells[i].appendChild(divH);
    }
}
function showPart(id, task){
    var pnDivs = document.getElementsByName("taskpn[]");
    pnDivs[parseInt(id.charAt(11))].innerHTML = tasks[task][1];
}

function submitForm(data){
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('error', handleXHRError);
    xhr.open('POST', '');
    xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
    
    xhr.onload = function(){
        if(xhr.status === 200){
            document.querySelector('form').submit();
        }
        else{
            console.log('connection failed. returned status of '+xhr.status);
            return false;
        }           
    }
    xhr.send(data);
}