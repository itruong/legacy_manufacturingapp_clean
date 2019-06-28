

/*
Precondition: Takes in the download button id (for distinguishing between different downloads), download filename, and csrf token.
Postcondition: Communicates with the server to retrieve the appropriate download file. Prompts browser download of the file or logs an error into the console upon failure.
*/
function getData(id, filename, csrf){
	var xhr = new XMLHttpRequest();
	xhr.open('POST', '');
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	
	xhr.onload = function() {
		if (xhr.status === 200){
			var blob = new Blob([xhr.response], { type: 'application/zip'});
			var link = document.createElement("a");
			if (link.download !== undefined) { // feature detection
				// Browsers that support HTML5 download attribute
				var url = URL.createObjectURL(blob);
				link.setAttribute("href", url);
				link.setAttribute("download", filename+'.zip');
				link.style.visibility = 'hidden';
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}
		}
		else{
			console.log('request failed. returned status of '+xhr.status);
		}
	};
	var data = 'csrfmiddlewaretoken='+csrf+'&data='+id;
	xhr.responseType = "arraybuffer"
	xhr.send(data);
}

