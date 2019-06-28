makeTotalTableRows("divLabTableRow[]")

var divLabCat = document.getElementsByName("divLabCat[]");
for(var n=0;n<divLabCat.length;n++){
    switch(n){
        case 0:
            divLabCat[n].innerHTML = "Group Leader Activities";
            break;
        case 1:
            divLabCat[n].innerHTML = "Material Issues";
            break;
        case 2:
            divLabCat[n].innerHTML = "ECO / Dev. Rework";
            break;
        case 3:
            divLabCat[n].innerHTML = "Engineering Rework";
            break;
        case 4:
            divLabCat[n].innerHTML = "Lab Cleaning";
            break;
        case 5:
            divLabCat[n].innerHTML = "Quality Audit";
            break;
        case 6:
            divLabCat[n].innerHTML = "SAP Transactions";
            break;
        case 7:
            divLabCat[n].innerHTML = "Machine / Test Equipment Down";
            break;
        case 8:
            divLabCat[n].innerHTML = "Preventative Maintenance";
            break;
        case 9:
            divLabCat[n].innerHTML = "Deferred Labor";
    }
}

makeTotalTableRows("nsLabTableRow[]")

var nsLabCat = document.getElementsByName("nsLabCat[]");
for(var n=0;n<nsLabCat.length;n++){
    switch(n){
        case 0:
            nsLabCat[n].innerHTML = "Warranty CHG No. 20800401";
            break;
        case 1:
            nsLabCat[n].innerHTML = "Non-Warranty CHG No. 20800402";
            break;
        case 2:
            nsLabCat[n].innerHTML = "Vector Charge No.";
            break;
        case 3:
            nsLabCat[n].innerHTML = "Kangda 80 Charge No.";
            break;
        case 4:
            nsLabCat[n].innerHTML = "Charge No.";
            break;
        case 5:
            nsLabCat[n].innerHTML = "Charge No.";
    }
}

var tselects = document.getElementsByClassName("taskno[]");
for(var n=0;n<tselects.length;n++){
    var tselect = tselects[n];
    tselect.setAttribute("onchange", "showPart(this.id, this.value); showDesc(this.id, this.value)");
}

makeTotalTableRows("taskTableRow[]")