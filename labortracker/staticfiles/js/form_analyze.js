
/*
Prevents default contextmenu from being displayed on rightclick
*/
var charts = document.getElementsByClassName('chart');
for(var i=0;i<charts.length;i++){
	charts[i].addEventListener('contextmenu',function(event){
		event.preventDefault();
		console.log('rightclick');
		return false;
	}, false);
}

class DataGenerator{
	constructor(data){
		this.rawData = data;
	}

}

class InteractiveController{
	constructor(container, id, data, title, dimensions, datasets, dGen=null){
        this.parent = container;
        this.data_iStart = 0;
        this.data_iEnd = data.length;
		this.resetData(data);
		this.id = `${this.constructor.name}-${id}`;
		this.dependents = [];
		this.label = title;
		this.dataGenerator = dGen;
		this.initFigure();
		this.setTitle(title);

		this.dimensions = dimensions;
		this.activeDimension = Object.keys(dimensions)[0];
		this.initActiveSeries();
		//this.namedSeries = this.dimensions[this.activeDimension];
		//this.activeSeries = new Set(this.series);
		this.datasets = datasets;
		this.activeDataset = this.datasets[0];
	}
	addActiveSeries(dim,vals){ 
        const add = [];
		for (const val of vals){
			if (!this.activeSeries[dim].has(val)){
				add.push(val);
				this.activeSeries[dim].add(val); 
			}
        }
        if (this.activeDimension == dim){
            for (const d of this.dependents)
			    d.updateAddActiveSeries(add);
        }
        else{
            this.resetData(this.dataGenerator.generateData(this.activeDimension, this.activeSeries));
            for (const d of this.dependents)
                d.updateAll();
        }
		
		return this.activeSeries;
	};
	delActiveSeries(dim,vals){ 
		const del = [];
		for (const val of vals){
			if (this.activeSeries[dim].has(val)){
				del.push(val);
				this.activeSeries[dim].delete(val); 
			}
        }
        if (this.activeDimension == dim){
            for (const d of this.dependents)
                d.updateDelActiveSeries(del);
        }
        else{
            this.resetData(this.dataGenerator.generateData(this.activeDimension, this.activeSeries));
            for (const d of this.dependents)
                d.updateAll();
        }
        return this.activeSeries;
	};
	getActiveSeries(){
		return this.activeSeries; 
	};
	getAllSeries() { return [...this.series]; };
	getData(){ return [...this.data]; };
	getNamedSeries() { return this.namedSeries; };
	initFigure(id){
		this.figure = document.createElement('div');
        this.figure.setAttribute('id',this.id);
        this.figure.setAttribute('class','chart');

        this.title = document.createElement('p');
        this.title.setAttribute('id', `${this.id}-title`);
		this.figure.appendChild(this.title);
		this.parent.appendChild(this.figure);
	};
	initActiveSeries(){
		this.activeSeries = {};
		for (const dim of Object.keys(this.dimensions)){
			this.activeSeries[dim] = new Set([].concat.apply([], Object.values(this.dimensions[dim])));
		}
		this.series = [].concat.apply([], Object.values(this.dimensions[this.activeDimension]));
	}
	linkDependent(obj){ this.dependents.push(obj); };
	resetData(data){
		this.allData = data;
		this.data = data.slice(this.data_iStart,this.data_iEnd);
	};
	setActiveDataset(dataset){
		this.activeDataset = dataset;
		for (const d of this.dependents)
			d.updateActiveDataset();
	}
	setActiveDimension(dim){
		this.activeDimension = dim;
		this.series = [].concat.apply([], Object.values(this.dimensions[dim]));
        this.resetData(this.dataGenerator.generateData(dim,this.dataGenerator.params));
        
        for (const d of this.dependents)
			d.updateActiveDimension();
		//this.namedSeries = this.dimensions[dim];
    }
    setConsolidate(on){
        for (const d of this.dependents)
            d.updateConsolidate(on)
    }
	setData(slice1,slice2){ 
        this.data_iStart = slice1;
        this.data_iEnd = slice2;
        this.data = this.allData.slice(slice1,slice2); 
    };
	setTitle(name){ this.title.innerHTML = name; };

}

class InteractiveGraph{
	/*
	An InteractiveGraph object represents an svg graph which displays its data dynamically.
	*/
	constructor(controller, id, xKey, yKey,){
		
		this.secondaryColors = ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c",
				"#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6",
				"#6a3d9a"];
		this.primaryColors = [].concat(["black","steelblue","darkorange"],this.secondaryColors);
		this.patterns = ['0','0','7 7 1 7', '4'];
		this.domain_max = 25
		this.label_positions = {};
		this.margin = { top: 50, right: 200, bottom: 100, left: 50 };
		this.height = 770 - this.margin.top - this.margin.bottom;
		this.width = 1190 - this.margin.left - this.margin.right;
		this.id = `${this.constructor.name}-${id}`;
		this.controller = controller;
		this.active = this.controller.getActiveSeries()[this.controller.activeDimension];
		this.setMaxDict();
		this.initLineProperties();
		this.initFigure(xKey,yKey);
		this.controller.linkDependent(this);
	}
	
	getAssigned_colors = () => this.assigned_colors
	getDomain_max() { return this.domain_max; }
	getPrimaryColors(n) { return this.primaryColors[n % this.primaryColors.length]; }
	getSecondaryColors(n) { return this.secondaryColors[n % this.secondaryColors.length]; }
	getPatterns(n) { return this.patterns[n % this.patterns.length]; }
	getHeight() { return this.height; }
	getLabel_positions() { return this.label_positions; };
	getMargin() { return this.margin; }
	getWidth() { return this.width; }

	//----------methods----------//
	addAxisProperty(){
        const ticks = this.figure.querySelector('[class=xaxis]').querySelectorAll('g');
        const first = ticks[0].querySelector('text');
        const last = ticks[ticks.length-1].querySelector('text')
        first.ondblclick = () => this.inputAxisValue(first, 0);
        last.ondblclick = () => this.inputAxisValue(last, 1);
	};
	setMaxDict(){
		this.max_dict = {};
		for (const dataset of this.controller.datasets){
			this.max_dict[dataset] = {};
			for (const series of this.controller.series)
			this.max_dict[dataset][series] = d3.max(this.controller.data, (d) => { 
				if(d[series])
					return d[series][dataset]
				return 0;
			});
		}
	}

	checkSelectAll(inputs){
		/*
		Precondition: Takes an array of DOM input checkbox objects.
		Postcondition: Returns true if all of the inputs are checked, false otherwise.
		*/	
		var allChecked = true;
		for (const input of inputs){
			if(!input.checked)
				allChecked = false;
		}
		return allChecked;
	};
	initLineProperties(){
		this.fills = {};
		for (const [i, key] of Object.keys(this.controller.dimensions[this.controller.activeDimension]).entries()){
			for (const [j, val] of this.controller.dimensions[this.controller.activeDimension][key].entries()){
				if (i == 0)
					var color = this.getPrimaryColors(j);
				else
					var color = this.getSecondaryColors(j);
				this.fills[val] = {'color':color, 'pattern':this.getPatterns(i)}
			}
		}
	}
	initXAxis(){
		this.xAxis = d3.axisBottom()
            .scale(this.xscale);/*
            .tickFormat((d,i) => {
                if(i != 0 && i != this.data.length-1)
                    return "";
                return d+" "+this.data[i]['team_members'];
            });*/
        this.xGrid = d3.axisBottom()
            .scale(this.xscale)
            .tickSize(-this.height)
            .tickFormat("");
	}
	setX(xKey){
		this.xLabel = xKey;
		const x = this.controller.data.map((d) => d[xKey]);
		var ranges = [];
        for (var i = 0; i < x.length; i++) {
            ranges.push(this.width * i / (x.length - 1));
        }
        this.xscale = d3.scaleOrdinal()
            .domain(x)
            .range(ranges);
		this.domain = this.xscale.domain();
	}
	
	setY(yKey){
		this.yLabel = yKey;
		this.yscale = d3.scaleLinear()
            //.domain([0, d3.max(data, function(d) {return d.y; })])
            .domain([0, Math.max.apply([],Object.values(this.max_dict[this.controller.activeDataset]))]).nice()
			.range([this.height, 0]);
	}
	
	setXAxis(domain){
		//ordinal X scale
		this.xscale.domain(domain);
        var ranges = [];
        for (var i = 0; i < domain.length; i++) 
            ranges.push(this.width * i / (domain.length - 1));
        this.xscale.range(ranges);
	}
	initYAxis(){
		this.yAxis = d3.axisLeft()
            .scale(this.yscale)
            .ticks(10, "s");

        this.yGrid = d3.axisLeft()
            .scale(this.yscale)
            .ticks(10, "s")
            .tickSize(-this.width)
			.tickFormat("");
	}
	setYAxis(minVal=null, maxVal=null){
		//linear Y scale
		if (maxVal == null || minVal == null){
			var maxVal = minVal= 0;
			for (const series of this.active.values()){
				if(this.max_dict[this.controller.activeDataset][series] > maxVal)
					maxVal = this.max_dict[this.controller.activeDataset][series];
			}
		}
		this.yscale.domain([minVal, maxVal]).nice();
	}
	initFigure(xKey,yKey){
		this.setX(xKey)
		this.setY(yKey)
        this.figure = document.createElement('div');
        this.figure.setAttribute('id',this.id); //container-svg
        this.figure.setAttribute('class', 'chart');
        this.controller.figure.appendChild(this.figure);
		/*
        var systable = document.createElement('div');
        systable.setAttribute('id','systable');
        systable.setAttribute('class','figure');
        figure.appendChild(systable);
		*/
		this.initXAxis();
		this.initYAxis();
        this.svg = d3.select("#"+this.id).append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
        
        const svgRect = this.svg.append("rect")
            .attr("class", "overlay")
            .attr("width", this.width)
            .attr("height", this.height)
            .on("mouseover", () => { this.focus.style("display", null); })
            .on("mouseout", () => { this.focus.style("display", "none"); });
			//.on("mousemove", this.mousemove);
		this.rect = this.figure.querySelector('rect');
		svgRect.on('mousemove', () => this.mousemove())

        //this.figure.querySelector('rect').onclick = (event) => this.createSysTable(event);
		this.initFocus();
        this.load();
		//this.loadLegend();
	}
	initFocus(){
		this.focus = this.svg.append("g")
            .attr("class", "focus")
            //.style("display", "none");

        this.focus.append("line")
            .attr("class", "x-hover-line hover-line")
            .attr("y1", 0)
            .attr("y2", this.height)
            .style('stroke','1px solid black');

        this.focus.append("text")
            .attr('id','tooltip-top')
            .attr("x", -12)
            .attr('y', -5);
        this.focus.append("text")
            .attr("id",'tooltip-bottom')
            .attr("x", -12)
            .attr('y', this.height+19)
            .style('display', 'none');
	}
	graphLegend(id, x, y){
		/*
		Precondition: Takes in the plot element id, x-position of the label, and y-position of the label.
		Postcondition: Displays the legend label at the specificed (x,y) location for the corresponding plot.
		*/
		this.svg.select("#legend_"+id.replace(/[^a-zA-Z0-9_]/g,'_')).remove();
		this.svg.select("#label_"+id.replace(/[^a-zA-Z0-9_]/g,'_')).remove();
		this.svg.append("line")
			.attr("x1", x)
			.attr("y1", y)
			.attr('x2', x+20)
			.attr('y2', y)
			.attr("id","legend_"+id.replace(/[^a-zA-Z0-9_]/g,'_'))
			.style('stroke-width', 3)
			.style('stroke-linecap', 'round')
			.style("stroke", this.fills[id].color)//this.assigned_colors[id]);
			.style('stroke-dasharray',this.fills[id].pattern);
		this.svg.append("text")
			.attr("x", x+25)
			.attr("dy", "0.75em")
			.attr("y", y)
			.attr("id","label_"+id.replace(/[^a-zA-Z0-9_]/g,'_'))
			.style('font-size','11')                           
			.text(id);
	};
	loadLegend(id){
		/*
		Precondition: Takes in the plot element id.
		Postcondition: Retrieves the label's y coordinate and calls graphLegend() to display the label and spaceLabels() to run the label-spacing algorithm.
		*/
		if(this.controller.data[this.controller.data.length-1][id])
			var	y = this.yscale(this.controller.data[this.controller.data.length-1][id][this.controller.activeDataset]);
		else
			var y = this.yscale(0);
		this.label_positions[id] = y;
		this.graphLegend(id, this.width+40, y);
		//this.spaceLabels(id, [], true);//Needs improvement
	};
	graphLine(id){
        this.svg.select("#line_"+id.replace(/[^a-zA-Z0-9_]/g,'_')).remove();
        let datum = this.controller.data;
		var line = d3.line()
			.x((d) =>  this.xscale(d[this.xLabel]))
			.y((d) => { 
				if (d[id])
					return this.yscale(d[id][this.controller.activeDataset]); 
				return this.yscale(0);
			});
		this.svg.append("path")
		.datum(datum)
		.attr("id","line_"+id.replace(/[^a-zA-Z0-9_]/g,'_'))
		.attr("class", "line")
		.attr("d", line)
		.style('stroke', this.fills[id].color)
		.style('stroke-dasharray',this.fills[id].pattern)
		.style('stroke-linejoin','round')
		.style('stroke-linecap','round')
		.style('stroke-width', '2px');
        //}
	};
	inputAxisValue(textElement, index){
        const rect = textElement.getBoundingClientRect();
        
        const input = document.createElement('select');
        this.domain.forEach((item) => {
            var option = document.createElement('option');
            if(item == textElement.innerHTML)
                option.selected = true;
            option.text = item;
            input.add(option);
        });
        textElement.remove();
        input.style.fontSize = '11px';
        input.style.position = 'absolute';
        input.style.top = (rect.top + window.scrollY) + 'px';
        input.style.left = (rect.left + window.scrollX) + 'px';
        input.style.width = '50px';
        input.addEventListener('keyup', (event) => {
            if(event.key === 'Escape'){
                input.remove();
                this.loadXAxis();
                this.addAxisProperty();
            }
        });
        window.onclick = (event) => {
            if(event.target != input){
                input.remove();
                this.loadXAxis();
                this.addAxisProperty();
                window.onclick = "";
            }
        };
        input.oninput = () => this.setAxisValue(input, index);
        this.controller.figure.appendChild(input);
	}
	setAxisValue(input, index){
		var slice_start, slice_end;
        if(index == 0){
            slice_start = this.domain.indexOf(input.value);
            slice_end = this.domain.indexOf(this.xscale.domain()[this.xscale.domain().length-1])+1;
        }
        else{
            slice_start = this.domain.indexOf(this.xscale.domain()[0]);
            slice_end = this.domain.indexOf(input.value)+1;
		}
        if(slice_start >= slice_end - 1){
            input.remove();
            this.loadXAxis();
            this.addAxisProperty();
            return;
        }
		var domain = this.domain.slice(slice_start,slice_end);
		this.setXAxis(domain);
        this.controller.setData(slice_start,slice_end);
        //this.durations = this.all_durations.slice(slice_start,slice_end);
        input.remove();
		this.load();
	}
	clear(series){
		this.svg.select(`#line_${series.replace(/[^a-zA-Z0-9_]/g, '_')}`).remove();
		this.svg.select(`#legend_${series.replace(/[^a-zA-Z0-9_]/g, '_')}`).remove();
		this.svg.select(`#label_${series.replace(/[^a-zA-Z0-9_]/g, '_')}`).remove();
	}
	clearActive(){
		for (const series of this.active.values())
			this.clear(series);
	}
	load(){
		this.loadXAxis();
		this.loadYAxis();
		this.clearActive();
		for (const series of this.active.values()){
			this.graphLine(series);
			this.loadLegend(series);
		}
		this.figure.querySelector('rect').parentElement.appendChild(this.figure.querySelector('rect'));
	}
	updateActiveDataset(){
		this.setYAxis();
		this.load();
	}
	updateActiveDimension(){

	}
	updateAddActiveSeries(seriesToAdd){
		this.setYAxis();
		this.load();
    }
    updateAll(){
        this.setMaxDict();
        this.setYAxis();
        this.load();
    }
    updateConsolidate(on){
        if (on){
            
        }
    }
	updateDelActiveSeries(seriesToDel){
		this.setYAxis();
		
		for (const series of seriesToDel){
			this.clear(series);
		}
		this.load();
	}

	loadXAxis(){
		/*
		Precondition: The axes and scales are initialized.
		Postcondition: Searches for the maximum value of checked plots in max_dict (dict of maximum y-axis values) and re-maps the axis to fit within (0, new_max).
		*/
		this.svg.selectAll('.xaxis').remove();
		this.svg.selectAll('.xgrid').remove();
		if(this.xscale.domain().length <= this.domain_max){
			this.focus.select('#tooltip-bottom').style('display','none');
			this.svg.append("g")
				.attr("class", "xgrid")
				.call(this.xGrid)
				.attr("transform", "translate(0," + this.height + ")")
				.attr('shape-rendering','crispEdges')
				.attr('stroke-width','0.5px')
				.attr("stroke-dasharray", "2,2");
		}
		else
			this.focus.select('#tooltip-bottom').style('display','block');
		this.svg.append("g")
			.attr("class", "xaxis")
			.attr("transform", "translate(0," + this.height + ")")
			.call(this.xAxis).append("text")
			.attr("x", this.width/2)
			.attr("y", 36)
			.attr("fill", "#000")
			.text(this.xLabel)
			.style("font-size", '16px');
			//.style("font-weight", "bold");
		this.addAxisProperty();
	};
	loadYAxis(){
		this.svg.selectAll('.yaxis').remove();
		this.svg.selectAll('.ygrid').remove();
		this.svg.append("g")
			.attr("class", "yaxis")
			.call(this.yAxis)
			.append("text")
			.attr("transform", "rotate(-90)")
			.attr("x", -this.height/2)
			.attr("y", -36)
			//.attr("dy", "0.3408em")
			.attr("fill", "#000")
			.text(this.yLabel)
			.style("font-size","16px");
			//.style("font-weight", "bold");
		this.svg.append("g")
			.attr("class", "ygrid")
			.call(this.yGrid)
			//.attr("transform", "rotate(180)")
			.attr('shape-rendering','crispEdges')
			.attr('stroke-width','0.5px')
			.attr("stroke-dasharray", "2,2");
	};
	/*
	!In development!
	Precondition:
	Postcondition:
	*/
	mousemove() {
		var x0 = d3.mouse(this.rect)[0];
		var idata = Math.round(x0 / this.xscale.range()[this.xscale.range().length - 1] * (this.xscale.range().length - 1));
		this.focus.attr("transform", "translate(" + this.xscale.range()[idata] + "," + 0 + ")");
		this.focus.select('#tooltip-top').text(() => {
			return this.xscale.domain()[idata];// + ' ' + this.controller.data[idata].team_members;
		});
		this.focus.selectAll('#tooltip-bottom').text(() => {
			if(idata == 0 | idata == this.xscale.range().length-1)
				return ''
			return this.xscale.domain()[idata];// + ' ' + this.controller.data[idata].team_members;
		});
		//var focus.attr("transform", "translate(" + graph.xscale.range()[idata] + "," + 0 + ")");
		//focus.attr("transform", "translateX(" + xscale1.range()[idata] + ")");
		var index = -1;
		/*
		var points = focus.selectAll(".datapoint")
			.attr('transform', function (d, i) {
				var sum = 0;
				for (var n = 0; n <= i; n++) {
					sum += data[idata][keys_chart1[n]]
				}
				return "translate(" + 0 + "," + yscale1(sum) + ")";
			});*/
		/*.each(function(d, i){
		d3.select(this).attr("transform","translate(" + 0 + "," + yscale1(data[idata][keys[i]]) + ")")
		})*/
		//var labels = focus.selectAll(".datatext")
			/*.attr('transform', function (d, i) {
				var sum = 0;
				for (var n = 0; n <= i; n++) {
					sum += data[idata][keys_chart1[n]]
				}
				//return "translate(" + (15-(30+(keys_chart1[i]).length*8)*(i%2)) + "," + yscale1(sum) + ")";
				return "translate(" + 15 + "," + yscale1(sum) + ")";
			})
			.text(function (d, i) {
				return keys_chart1[i] + ": " + data[idata][keys_chart1[i]];
			});*/
		/*for(var i=0;i<points.length;i++){
		points.attr("transform", "translate(" + 0 + "," + yscale1(data[idata].OP10) + ")");
		labels[i].attr("transform", "translate(" + 0 + "," + yscale1(data[idata].OP10) + ")");
		}*/
		//focus.select('circle').attr("transform", "translate(" + 0 + "," + yscale1(data[idata].OP10) + ")");
		//yscale1(data[idata].OP10)
		//focus.select("text").text(idata);
		//focus.select(".x-hover-line").attr("y1", height - yscale1(data[idata].OP10));
		//focus.select(".y-hover-line").attr("x2", width + width);
	};
	spaceLabels(id, skip=[], first=false){
		skip.push(id);
		var label = id;
		var depth_queue = [];
		var labels = [];
		for (const input of this.active.values()){
			if (skip.indexOf(input) < 0)
				labels.push(input);
		}
		//var labels = this.active.filter(input => skip.indexOf(input) < 0);
		for(var i=0;i<labels.length;i++){
			var label1 = labels[i];
			let y = this.label_positions[label];
			let y1 = this.label_positions[label1];
			let dy = y - y1;
			if(Math.abs(dy) < 13){
				if(dy <= 0){
					//label_positions[label] = y-5;
					//label_positions[label1] = y1+5;
					depth_queue.push([label1, 1]);
				}
				else{// if(dy > 0){
					depth_queue.push([label1, -1]);
				}
			}
		}
		var moved = false;
		while(depth_queue.length > 0){
			var item = depth_queue.shift();
			var label1 = item[0];
			var dy = item[1]*2;
			this.spaceLabels(label1, skip);
			this.graphLegend(label1, this.width+40, this.label_positions[label1] + dy);
			this.graphLegend(label, this.width+40, this.label_positions[label] - dy);
			
			this.label_positions[label1] = this.label_positions[label1]+dy;
			this.label_positions[label] = this.label_positions[label]-dy;
			moved = true;
		}
		if(moved && first)
			this.spaceLabels(id, [], first);
	};
}

class SystemsGraph extends InteractiveGraph{
	constructor(controller, id, ops, wtypes, system, std) {
		super(controller, id);
		this.system = system;
		this.max_dict = this.max_hrs_dict = {};
		this.max_eff_dict = {};
		this.ops = ops;
		this.wtypes = wtypes;
		this.labor_totals = ['TOTAL','SYSTEM ASSEMBLY', 'SYSTEM TEST'];
		this.all_labels = this.labor_totals.concat(ops, wtypes);
		this.units = 'hours';
		this.std = std;
		//this.createFigure(id);
		this.loadToggle();
		this.createSVG();

	}

	checkAll(id, check){
        if(id == 'operations')
            var inputs = this.figure.querySelectorAll('[name=ops]');
        else if(id == 'work_type')
            var inputs = this.figure.querySelectorAll('[name=wtype]');  
        else if(id == 'labor_totals')
            var inputs = this.figure.querySelectorAll('[name=labor]');
        else
            return
        for(var i=0;i<inputs.length;i++){
            inputs[i].checked = check;
            const id = inputs[i].id.replace(/[ /]+/g,'')
            if(!check){
                this.svg.select(`#line_${id}`).remove();
                this.svg.select(`#legend_${id}`).remove();
                this.svg.select(`#label_${id}`).remove();
            }
        }
	};
	createDurations(){
        this.all_durations = [];
        this.all_labels.forEach(function(label){
            this.data.forEach(function(entry, i){
                var start_date = '';
                var recent_date = '';
                var duration = '';
                if (label == this.all_labels[0]){
                    start_date = new Date(entry['start_date']);
                    recent_date = new Date(entry['recent_date']);
                }
                else if (label == this.all_labels[1]){
                    
                    this.ops.forEach(function(op){
                        this.wtypes.forEach(function(wtype){
                            if(op != 'TEST'){
                                if (entry['op_dates'][op][0][wtype] != ''){
                                    if (start_date == ''){
                                        start_date = new Date(entry['op_dates'][op][0][wtype]);
                                        recent_date = new Date(entry['op_dates'][op][1][wtype])
                                    }
                                    else{
                                        temp_start = new Date(entry['op_dates'][op][0][wtype]);
                                        temp_recent = new Date(entry['op_dates'][op][1][wtype]);
                                        if(Math.floor(temp_start - start_date) < 0)
                                            start_date = temp_start;
                                        if(Math.floor(temp_recent - recent_date) > 0)
                                            recent_date = temp_recent;
                                    }
                                }  
                            }
                        });
                    });
                }
                else if (label == this.all_labels[2]){
                    this.wtypes.forEach(function(wtype){
                        if (entry['op_dates']['TEST'][0][wtype] != ''){
                            if (start_date == ''){
                                start_date = new Date(entry['op_dates']['TEST'][0][wtype]);
                                recent_date = new Date(entry['op_dates']['TEST'][1][wtype])
                            }
                            else{
                                temp_start = new Date(entry['op_dates']['TEST'][0][wtype]);
                                temp_recent = new Date(entry['op_dates']['TEST'][1][wtype]);
                                if(Math.floor(temp_start - start_date) < 0)
                                    start_date = temp_start;
                                if(Math.floor(temp_recent - recent_date) > 0)
                                    recent_date = temp_recent;
                            }
                        }  
                    });
                }
                else if (this.ops.indexOf(label) >= 0){
                    this.wtypes.forEach(function(wtype){
                        if (entry['op_dates'][label][0][wtype] != ''){
                            if (start_date == ''){
                                start_date = new Date(entry['op_dates'][label][0][wtype]);
                                recent_date = new Date(entry['op_dates'][label][1][wtype])
                            }
                            else{
                                temp_start = new Date(entry['op_dates'][label][0][wtype]);
                                temp_recent = new Date(entry['op_dates'][label][1][wtype]);
                                if(Math.floor(temp_start - start_date) < 0)
                                    start_date = temp_start;
                                if(Math.floor(temp_recent - recent_date) > 0)
                                    recent_date = temp_recent;
                            }
                        }  
                    });
                }
                else if (this.wtypes.indexOf(label) >= 0){
                    this.ops.forEach(function(op){
                        if (entry['op_dates'][op][0][label] != ''){
                            if (start_date == ''){
                                start_date = new Date(entry['op_dates'][op][0][label]);
                                recent_date = new Date(entry['op_dates'][op][1][label])
                            }
                            else{
                                temp_start = new Date(entry['op_dates'][op][0][label]);
                                temp_recent = new Date(entry['op_dates'][op][1][label]);
                                if(Math.floor(temp_start - start_date) < 0)
                                    start_date = temp_start;
                                if(Math.floor(temp_recent - recent_date) > 0)
                                    recent_date = temp_recent;
                            }
                        }  
                    });
                    
                }
                duration = Math.floor(recent_date - start_date)/(1000*60*60*24);
                if(this.all_durations[i] == undefined){
                    this.all_durations[i] = {'serial': entry.serial};
                    this.all_durations[i][label] = duration;
                }
                else
                    this.all_durations[i][label] = duration;
            }.bind(this));
        }.bind(this));
        this.durations = this.all_durations;
    }
	
	createSVG(){
        const serials = this.data.map((d) => d.serial);
        var ranges = [];
        for (var i = 0; i < serials.length; i++) {
            ranges.push(this.width * i / (serials.length - 1));
        }
        this.xscale = d3.scaleOrdinal()
            .domain(serials)
            .range(ranges);
        this.domain = this.xscale.domain();
        /*var x = d3.scaleLinear()
            .domain(d3.extent(data, function(d) { return d.serial; }))
            .range([0, width]);*/
        this.yscale = d3.scaleLinear()
            //.domain([0, d3.max(data, function(d) {return d.y; })])
            .domain([0, 0]).nice()
            .range([this.height, 0]);
        this.xAxis = d3.axisBottom()
            .scale(this.xscale)
            .tickFormat((d,i) => {
                if(i != 0 && i != this.data.length-1)
                    return "";
                return d+" "+this.data[i]['team_members'];
            });
            //.ticks(20, "s");

        this.xGrid = d3.axisBottom()
            .scale(this.xscale)
            .tickSize(-this.height)
            .tickFormat("");

        this.yAxis = d3.axisLeft()
            .scale(this.yscale)
            .ticks(10, "s");

        this.yGrid = d3.axisLeft()
            .scale(this.yscale)
            .ticks(10, "s")
            .tickSize(-this.width)
            .tickFormat("");

        this.svg = d3.select("#"+this.figure.id).select('#container-svg').append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
        
        this.svg.append("rect")
            .attr("class", "overlay")
            .attr("width", this.width)
            .attr("height", this.height)
            .on("mouseover", () => { this.focus.style("display", null); })
            .on("mouseout", () => { this.focus.style("display", "none"); })
            .on("mousemove", mousemove);

        this.figure.querySelector('rect').onclick = (event) => this.createSysTable(event);

        this.focus = this.svg.append("g")
            .attr("class", "focus")
            //.style("display", "none");

        this.focus.append("line")
            .attr("class", "x-hover-line hover-line")
            .attr("y1", 0)
            .attr("y2", this.height)
            .style('stroke','1px solid black');

        this.focus.append("text")
            .attr('id','tooltip-top')
            .attr("x", -12)
            .attr('y', -5);
        this.focus.append("text")
            .attr("id",'tooltip-bottom')
            .attr("x", -12)
            .attr('y', this.height+19)
            .style('display', 'none');

/*
        this.svg.append("text")
            .attr("x", 0)
            .attr("y", -40)
            .attr("dy", "0.71em")
            .attr("fill", "#000")
            .text(this.system+" - Labor Hours Per System")
            .style("font", "23px segoe ui")
            .style("font-weight", "300")
            .style("fill", "#000000");
*/
        this.svg.append("g")
            .attr("class", "xaxis")
            .attr("transform", "translate(0," + this.height + ")")
            .call(this.xAxis).append("text")
            .attr("x", this.width/2)
            .attr("y", 36)
            .attr("fill", "#000")
            //.style("font-weight", "bold");
        this.svg.append("g")
            .attr("class", "yaxis")
            .call(this.yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -200)
            .attr("y", -40)
            //.attr("dy", "0.3408em")
            .attr("fill", "#000")
            //.text("Hours")
            .style("font-weight", "bold");
    };
	getChecked() {
		/*
		Precondition:
		Postcondition: Returns an array of all checked DOM input checkbox objects.
		*/
		var checked = [];
		var inputs = this.figure.getElementsByClassName('check');
		for (var i = 0; i < inputs.length; i++) {
			if (inputs[i].checked)
				checked.push(inputs[i]);
		}
		return checked;
	};
	graphLine(id){
        this.svg.select("#line_"+id.replace(/[ /]+/g,'')).remove();
        let datum = this.data;
        if(this.units == 'hours'){
            var line = d3.line()
                .x((d) =>  this.xscale(d.serial))
                .y((d) => this.yscale(d[id]));
        }
        else if(this.units == 'days'){
            datum = this.durations
            var line = d3.line()
                .x((d) => this.xscale(d.serial))
                .y((d) => this.yscale(d[id]));
        }
        else{
            var line = d3.line()
                .x((d) => this.xscale(d.serial))
                .y((d) => this.yscale((d[id] < this.std[id]) ? 100: 100*this.std[id]/d[id]));
        }
        if (this.wtypes.indexOf(id)>=0){
            this.svg.append("path")
            .datum(datum)
            .attr("id","line_"+id.replace(/[ /]+/g,''))
            .attr("class", "line")
            .attr("d", line)
            .style('stroke', this.assigned_colors[id])
            .style('stroke-linejoin','round')
            .style('stroke-linecap','round')
            .style('stroke-dasharray','7, 7, 1, 7')
            .style('stroke-width', '2px');
        }
        else{
            this.svg.append("path")
            .datum(datum)
            .attr("id","line_"+id.replace(/[ /]+/g,''))
            .attr("class", "line")
            .attr("d", line)
            .style('stroke', this.assigned_colors[id])
            .style('stroke-linejoin','round')
            .style('stroke-linecap','round')
            .style('stroke-width', '2px');
        }
	};
	inputAxisValue(textElement, index){
        const rect = textElement.getBoundingClientRect();
        
        const input = document.createElement('select');
        this.domain.forEach((item) => {
            var option = document.createElement('option');
            if(item == textElement.innerHTML.substr(0,4))
                option.selected = true;
            option.text = item;
            input.add(option);
        });
        textElement.remove();
        input.style.fontSize = '11px';
        input.style.position = 'absolute';
        input.style.top = (rect.top + window.scrollY) + 'px';
        input.style.left = (rect.left + window.scrollX) + 'px';
        input.style.width = '50px';
        input.addEventListener('keyup', (event) => {
            if(event.key === 'Escape'){
                input.remove();
                this.reloadXAxis();
                this.addAxisProperty();
            }
        });
        window.onclick = (event) => {
            if(event.target != input){
                input.remove();
                this.reloadXAxis();
                this.addAxisProperty();
                window.onclick = "";
            }
        };
        input.oninput = () => this.setAxisValue(input, index); //'this.parentElement.graph.setAxisValue(this,'+index+')');
        this.controller.figure.appendChild(input);
	}
	setAxisValue(input, index){
        var slice_start, slice_end;
        if(index == 0){
            slice_start = this.domain.indexOf(input.value);
            slice_end = this.domain.indexOf(this.xscale.domain()[this.xscale.domain().length-1])+1;
        }
        else{
            slice_start = this.domain.indexOf(this.xscale.domain()[0]);
            slice_end = this.domain.indexOf(input.value)+1;
        }
        if(slice_start >= slice_end - 1){
            input.remove();
            this.reloadXAxis();
            this.addAxisProperty();
            return;
        }
		var domain = this.domain.slice(slice_start,slice_end);
		this.setYAxis(domain);
                
        this.controller.data = this.controller.all_data.slice(slice_start,slice_end);
        this.durations = this.all_durations.slice(slice_start,slice_end);
        input.remove();
        this.toggleGraphs('TOTAL');
        this.figure.querySelector('[id=datatable]').innerHTML = '';
        this.createDataTableValues();
        this.createDataTable();
    }
}

class InteractiveTable{
	constructor(controller, id){
		this.id = `${this.constructor.name}-${id}`;
		this.controller = controller;
		this.createFigure(this.id)
	}

	createDataTable(){
        const dt = this.figure.querySelector('[id=datatable]');
        const df = document.createDocumentFragment()
        const p = document.createElement('p');
        const sys_label1 = document.createElement('span');
        const sys_label2 = document.createElement('span');
        
        p.innerHTML = 'Serial Range: ';
        p.style.fontWeight = 300;
        p.style.fontSize = '18px';
        
        sys_label1.innerHTML = this.data[0].serial;        
        //sys_label1.ondblclick = () => this.inputAxisValue(sys_label1,0);
        sys_label2.innerHTML = this.data[this.data.length-1].serial;

        p.appendChild(sys_label1)
        p.appendChild(document.createTextNode('-'));
        p.appendChild(sys_label2);
        df.appendChild(p)

        const count = document.createElement('span');
        count.innerHTML = 'Count: ' + this.data.length;
        count.style.fontWeight = 300;
        count.style.fontSize = '18px';
        
        df.appendChild(count)

        const table = document.createElement('table');
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        var row = document.createElement('tr');
        tbody.appendChild(row);

        this.datatable_types.forEach((label) => {
            const th = document.createElement('th');
            th.colSpan = this.datatable_headers.length;
            th.style.textAlign = 'center';
            th.innerHTML = label;
            row.appendChild(th);
        });
        row = document.createElement('tr');
        this.datatable_types.forEach((label) => {
            this.datatable_headers.forEach((header, i) => {
                const th = document.createElement('th');
                th.style.textAlign = 'center';
                th.innerHTML = this.datatable_headers[i];
                row.appendChild(th);
            });
        });
        tbody.appendChild(row);
        
        this.all_labels.forEach((label) => {
            row = document.createElement('tr');
            this.datatable_headers.forEach((header, i) => {
                var td = document.createElement('td');
                td.style.textAlign = 'right';
                if (header == 'Series'){
                    td.innerHTML = label;
                    td.style.textAlign = 'left'
                    //td.style.fontWeight = 500;
                }
                    
                else if(header == 'Mean'){
                    td.innerHTML = this.datatable_mean[label]['hrs'];
                }
                else if(header == 'Max'){
                    td.innerHTML = this.datatable_max[label]['hrs'];
                }
                else if(header == 'Max (sys)'){
                    td.innerHTML = this.datatable_max_sys[label]['hrs'];
                }
                else if(header == 'Min'){
                    td.innerHTML = this.datatable_min[label]['hrs'];
                }
                else if(header == 'Min (sys)'){
                    td.innerHTML = this.datatable_min_sys[label]['hrs'];
                }
                else if(header == 'σ'){
                    td.innerHTML = this.datatable_sd[label]['hrs'];
                }
                row.appendChild(td);
            });
            this.datatable_headers.forEach((header) => {
                var td = document.createElement('td');
                
                td.style.textAlign = 'right';
                if (header == 'Series'){
                    td.style.borderLeft = '1px solid black';
                    td.innerHTML = label;
                    td.style.textAlign = 'left'
                    //td.style.fontWeight = 500;
                }
                    
                else if(header == 'Mean'){
                    td.innerHTML = this.datatable_mean[label]['days'];
                }
                else if(header == 'Max'){
                    td.innerHTML = this.datatable_max[label]['days'];
                }
                else if(header == 'Max (sys)'){
                    td.innerHTML = this.datatable_max_sys[label]['days'];
                }
                else if(header == 'Min'){
                    td.innerHTML = this.datatable_min[label]['days'];
                }
                else if(header == 'Min (sys)'){
                    td.innerHTML = this.datatable_min_sys[label]['days'];
                }
                else if(header == 'σ'){
                    td.innerHTML = this.datatable_sd[label]['days'];
                }
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });

        df.appendChild(p);
        df.appendChild(count);
        df.appendChild(table);
        dt.appendChild(df);
	}
	createDataTableValues(){
        this.datatable_types = ['Labor (hrs)', 'Duration (days)']; // add duration
        this.datatable_headers = [
            'Series', 'Mean', 'Max', 'Max (sys)', 'Min', 'Min (sys)', 'σ',
        ];
        this.datatable_mean = {};
        this.datatable_max = {};
        this.datatable_max_sys = {};
        this.datatable_min = {};
        this.datatable_min_sys = {};
        this.datatable_sd = {};
        //this.durations = {};
        this.all_labels.forEach((label) => {
            var sum = 0;
            var max = 0;
            var max_sys = this.data[0]['serial'];
            var min_sys = this.data[0]['serial'];
            var min = this.data[0][label];
            var sd_sum = 0;
            this.data.forEach((entry) => {
                sum += entry[label];
                if (entry[label] > max){
                    max = entry[label];
                    max_sys = entry['serial'];
                }
                if(entry[label] < min){
                    min = entry[label];
                    min_sys = entry['serial'];
                }
            });
            var mean = sum/this.data.length;
            this.data.forEach((entry) => {
                var temp = entry[label] - mean
                sd_sum += temp*temp;
            });
            
            var sd = Math.sqrt(sd_sum/this.data.length);
            this.datatable_mean[label] = {'hrs':mean.toFixed(2)};
            this.datatable_max[label] = {'hrs':max};
            this.datatable_max_sys[label] = {'hrs':max_sys};
            this.datatable_min[label] = {'hrs':min};
            this.datatable_min_sys[label] = {'hrs':min_sys};
            this.datatable_sd[label] = {'hrs':sd.toFixed(2)};

            sum = 0;
            sd_sum = 0;
            max = -1;
            min = -1;
            var max_sys = '-';
            var min_sys = '-';
            this.data.forEach((entry, i) => {
                var start_date = '';
                var recent_date = '';
                var duration = '';
                if (label == this.all_labels[0]){
                    start_date = new Date(entry['start_date']);
                    recent_date = new Date(entry['recent_date']);
                }
                else if (label == this.all_labels[1]){
                    
                    this.ops.forEach((op) => {
                        this.wtypes.forEach((wtype) => {
                            if(op != 'TEST'){
                                if (entry['op_dates'][op][0][wtype] != ''){
                                    if (start_date == ''){
                                        start_date = new Date(entry['op_dates'][op][0][wtype]);
                                        recent_date = new Date(entry['op_dates'][op][1][wtype])
                                    }
                                    else{
                                        temp_start = new Date(entry['op_dates'][op][0][wtype]);
                                        temp_recent = new Date(entry['op_dates'][op][1][wtype]);
                                        if(Math.floor(temp_start - start_date) < 0)
                                            start_date = temp_start;
                                        if(Math.floor(temp_recent - recent_date) > 0)
                                            recent_date = temp_recent;
                                    }
                                }  
                            }
                        });
                    });
                }
                else if (label == this.all_labels[2]){
                    this.wtypes.forEach((wtype) => {
                        if (entry['op_dates']['TEST'][0][wtype] != ''){
                            if (start_date == ''){
                                start_date = new Date(entry['op_dates']['TEST'][0][wtype]);
                                recent_date = new Date(entry['op_dates']['TEST'][1][wtype])
                            }
                            else{
                                temp_start = new Date(entry['op_dates']['TEST'][0][wtype]);
                                temp_recent = new Date(entry['op_dates']['TEST'][1][wtype]);
                                if(Math.floor(temp_start - start_date) < 0)
                                    start_date = temp_start;
                                if(Math.floor(temp_recent - recent_date) > 0)
                                    recent_date = temp_recent;
                            }
                        }  
                    });
                }
                else if (this.ops.indexOf(label) >= 0){
                    this.wtypes.forEach((wtype) => {
                        if (entry['op_dates'][label][0][wtype] != ''){
                            if (start_date == ''){
                                start_date = new Date(entry['op_dates'][label][0][wtype]);
                                recent_date = new Date(entry['op_dates'][label][1][wtype])
                            }
                            else{
                                temp_start = new Date(entry['op_dates'][label][0][wtype]);
                                temp_recent = new Date(entry['op_dates'][label][1][wtype]);
                                if(Math.floor(temp_start - start_date) < 0)
                                    start_date = temp_start;
                                if(Math.floor(temp_recent - recent_date) > 0)
                                    recent_date = temp_recent;
                            }
                        }  
                    });
                }
                else if (this.wtypes.indexOf(label) >= 0){
                    this.ops.forEach((op) => {
                        if (entry['op_dates'][op][0][label] != ''){
                            if (start_date == ''){
                                start_date = new Date(entry['op_dates'][op][0][label]);
                                recent_date = new Date(entry['op_dates'][op][1][label])
                            }
                            else{
                                temp_start = new Date(entry['op_dates'][op][0][label]);
                                temp_recent = new Date(entry['op_dates'][op][1][label]);
                                if(Math.floor(temp_start - start_date) < 0)
                                    start_date = temp_start;
                                if(Math.floor(temp_recent - recent_date) > 0)
                                    recent_date = temp_recent;
                            }
                        }  
                    });
                    
                }
                duration = Math.floor(recent_date - start_date)/(1000*60*60*24);
                if (duration > max){
                    max = duration;
                    max_sys = entry.serial;
                }
                if (min == -1 || (duration < min)){
                    min = duration;
                    min_sys = entry.serial;
                }
                if(!isNaN(duration))
                    sum+=duration;
            });
            
            var mean = sum/this.data.length;
            this.all_durations.forEach((entry) => {
                const temp = entry[label] - mean
                sd_sum += temp**2;
            });
            var sd = Math.sqrt(sd_sum/this.all_durations.length);
            this.datatable_mean[label]['days'] = mean.toFixed(2);
            this.datatable_max[label]['days'] = max;
            this.datatable_max_sys[label]['days'] = max_sys;
            this.datatable_min[label]['days'] = min;
            this.datatable_min_sys[label]['days'] = min_sys;
            this.datatable_sd[label]['days'] = sd.toFixed(2);
        });
	}
	createSysTable(event){
        var x0 = event.clientX - event.target.getBoundingClientRect().left;
        var idata = Math.round(x0 / this.xscale.range()[this.xscale.range().length - 1] * (this.xscale.range().length - 1));
        var st = this.figure.querySelector('[id=systable]');
        st.innerHTML = '';
        var p = document.createElement('p');
        st.appendChild(p);
        p.innerHTML = 'Serial No.: ' + this.data[idata].serial;
        p.style.fontWeight = 300;
        p.style.fontSize = '18px';

        var dates = document.createElement('p');
        var sd = new Date(this.data[idata].start_date);
        var rd = new Date(this.data[idata].recent_date);
        dates.innerHTML = sd.toUTCString().slice(5,16) + ' - ' + rd.toUTCString().slice(5,16);
        dates.style.fontWeight = 300;
        dates.style.fontSize = '18px';
        st.appendChild(dates);

        var squads = document.createElement('p');
        if(this.data[idata].team_members)
            squads.innerHTML = 'Team: ' + this.data[idata].team_members;
        else
            squads.innerHTML = 'Team: N/A';
        squads.style.fontWeight = 300;
        squads.style.fontSize = '18px';
        st.appendChild(squads);

        var table = document.createElement('table');
        var tbody = document.createElement('tbody');
        st.appendChild(table);
        table.appendChild(tbody);


        this.systable_headers = ['Series', 'Labor (hrs)', 'Duration (days)'];
        row = document.createElement('tr');
        this.systable_headers.forEach((header, i) => {
            var th = document.createElement('th');
            th.style.textAlign = 'center';
            th.innerHTML = this.systable_headers[i];
            row.appendChild(th);
        });
        tbody.appendChild(row);

        for (const label of this.all_labels) {
            row = document.createElement('tr');
            for (const [i, header] of this.systable_headers.entries()) {
                var td = document.createElement('td');
                td.style.textAlign = 'right';
                if (i == 0){
                    td.innerHTML = label;
                    td.style.textAlign = 'left'
                    //td.style.fontWeight = 500;
                }
                else if(i == 1)
                    td.innerHTML = this.data[idata][label];
                else if(i == 2)
                    td.innerHTML = this.durations[idata][label];
                row.appendChild(td);
            }
            tbody.appendChild(row);
        }

    }
	createFigure(i){
		this.table = document.createElement('div');
        this.table.setAttribute('id', 'datatable');
        this.table.setAttribute('class', 'figure');
		this.controller.figure.appendChild(this.table);
		
		this.title = document.createElement('p');
        this.title.setAttribute('id', 'title');
		this.controller.figure.appendChild(this.title);
	}

}

class ToggleTable{
	constructor(controller, id){
		this.id = `${this.constructor.name}-${id}`;
		this.controller = controller;
		this.initFigure();
		this.initContext();
	}

	initFigure(){
		this.figure = document.createElement('div');
        this.figure.setAttribute('id', 'configuration');
		this.figure.setAttribute('class', 'modal');
		this.figure.style.display = 'none';
        this.content = document.createElement('div');
		this.content.setAttribute('class', 'modal-content');
		this.figure.appendChild(this.content);
    	this.table = document.createElement('table');
        this.table.setAttribute('id','chart_table');
        
        this.content.appendChild(this.table);

        const tbody = document.createElement('tbody')
        tbody.setAttribute('id','chart_selections');
        this.table.appendChild(tbody);

		tbody.appendChild(document.createElement('tr'));
		let row = tbody.firstElementChild;
		let cell = document.createElement('th');
		row.appendChild(cell);
		//cell.colSpan = Object.keys(namedSeries).length;
		cell.innerHTML = 'Datasets';
		let first = true;
		for (const dataset of this.controller.datasets){
			row = document.createElement('tr');
			tbody.appendChild(row);
			let td = document.createElement('td');
			//td.colSpan = cell.colSpan;
			let input = document.createElement('input');
			if (first){
				input.checked = true;
				first = false;
			}
			input.type = 'radio';
			input.id = `${dataset.replace(/[^a-zA-Z0-9_]/g,'_')}_datasets`;
			input.className = 'radio';
			input.name = `${this.id}_datasets`;
			input.onchange = () => this.controller.setActiveDataset(dataset);
			td.appendChild(input);
			td.appendChild(document.createTextNode(dataset));
			row.appendChild(td);
		}
		
		row = document.createElement('tr');
		tbody.appendChild(row);
		cell = document.createElement('th');
		row.appendChild(cell);
		//cell.colSpan = Object.keys(namedSeries).length;
		cell.innerHTML = 'Select Visible Series:';
		first = true;
		for (const dim of Object.keys(this.controller.dimensions)){
			row = document.createElement('tr');
			tbody.appendChild(row);
			let td = document.createElement('td');
			//td.colSpan = cell.colSpan;
			let input = document.createElement('input');
			if (first){
				input.checked = true;
				first = false;
			}
			input.type = 'radio';
			input.id = `${dim.replace(/[^a-zA-Z0-9_]/g,'_')}_dimensions`;
			input.className = 'radio';
			input.name = `${this.id}_dimensions`;
			input.onchange = () => this.controller.setActiveDimension(dim);
			td.appendChild(input);
			td.appendChild(document.createTextNode(dim));
			row.appendChild(td);
        }
        {
            row = document.createElement('tr');
            tbody.appendChild(row);
            let td = document.createElement('td');
            row.appendChild(td)
            td.innerHTML = 'Consolidate:'
            row = document.createElement('tr');
            tbody.appendChild(row);
            td = document.createElement('td');
            row.appendChild(td);
            const inp = document.createElement('input');
            inp.type = 'checkbox';
            inp.onchange = () => this.controller.setConsolidate(inp.checked);
            td.appendChild(inp);
        }
		this.activeGroups = {};
		for (const [dim,namedSeries] of Object.entries(this.controller.dimensions)){
			for (const [groupName, group] of Object.entries(namedSeries))
				this.activeGroups[groupName] = group.length;
			row = document.createElement('tr');
			tbody.appendChild(row);
			for (const label of Object.keys(namedSeries)){
				let th = document.createElement('th');
				let input = document.createElement('input');
				input.type = 'checkbox'
				input.id = label.replace(/[^a-zA-Z0-9_]/g,'_');
				input.className = 'check_all';
				input.checked = true;
				input.onchange = () => this.toggleGroup(dim, label);
				th.appendChild(input);
				th.appendChild(document.createTextNode(label));
				row.appendChild(th);
			}
			let i = 0;
			this.activeLookup = {};
			while (true){
				let curr = undefined;
				row = document.createElement('tr');
				for (const [groupName, group] of Object.entries(namedSeries)){
					curr = curr || group[i];
					const td = document.createElement('td');
					row.appendChild(td);
					if (group[i]){
						const id = group[i];
						const input = document.createElement('input');
						input.id = id.replace(/[^a-zA-Z0-9_]/g, '_');
						input.type = 'checkbox';
						input.class = 'check';
						input.name = groupName;
						input.checked = true;
						input.onchange = () => this.toggle(dim,id);
						td.appendChild(input);
						const label = document.createElement('label');
						label.setAttribute('for', id.replace(/[^a-zA-Z0-9_]/g, '_'));
						label.innerHTML = id;
						td.appendChild(label);
						this.activeLookup[id] = groupName;
					}
				}
				if (curr != undefined)
					tbody.appendChild(row);
				else
					break;
				i++;
			}
		}
		

		this.controller.figure.appendChild(this.figure);
	}
	initContext(){
		this.contextMenu = document.createElement('div');
		this.contextMenu.className = 'dropdown';
		this.contextMenu.id = 'contextMenu';
		const pad = document.createElement('div');
		pad.id = 'padding';
		this.contextMenu.appendChild(pad);
		const selection = document.createElement('span');
		selection.id = 'context-config';
		selection.className = 'contextItem';
		selection.innerHTML = 'Configuration';
		selection.onclick = () => {
			this.contextMenu.style.display = 'none';
			this.showConfiguration();
		}
		this.contextMenu.appendChild(selection);
		this.controller.figure.appendChild(this.contextMenu);
		this.controller.figure.addEventListener('contextmenu', (event) => {
			event.preventDefault();
			this.showContext(event);
			return false;
		});
	}

	/*
	initToggle(){
		for (const key of Object.keys(this.container.namedSeries))
        for(var i=0;i<Math.max(Object.values(this.controller.namedSeries));i++){
            var row = document.createElement('tr');
            var op_cell = document.createElement('td');
            var w_cell = document.createElement('td');
            if(i < this.ops.length){
                var input = document.createElement('input');
                input.setAttribute('id', this.ops[i]);
                input.setAttribute('type','checkbox');
                input.setAttribute('class','check');
                input.setAttribute('name','ops');
                input.setAttribute('onchange','toggleGraphs(this.id);');
                op_cell.appendChild(input);
                var label = document.createElement('label');
                label.setAttribute('for', this.ops[i]);
                label.innerHTML = this.ops[i];
                op_cell.appendChild(label);
                //this.max_hrs_dict[this.ops[i]] = d3.max(this.data, function(d){ return d[this.ops[i]]; });
            }
            if(i < this.wtypes.length){
                var input = document.createElement('input');
                input.setAttribute('id', this.wtypes[i]);
                input.setAttribute('type','checkbox');
                input.setAttribute('class', 'check');
                input.setAttribute('name','wtype');
                input.setAttribute('onchange','toggleGraphs(this.id);');
                w_cell.appendChild(input);
                var label = document.createElement('label');
                label.setAttribute('for', this.wtypes[i]);
                label.innerHTML = this.wtypes[i];
                w_cell.appendChild(label);
                //this.max_hrs_dict[wtypes[i]] = d3.max(this.data, function(d){ return d[this.wtypes[i]]; });
            }
            row.appendChild(document.createElement('td'));
            row.appendChild(op_cell);
            row.appendChild(w_cell);
            this.figure.getElementsByTagName('tbody')[0].appendChild(row);
        }
    }
    */
   	toggle(dim, id){
		let active = new Set(this.controller.getActiveSeries()[dim]);
		const groupName = this.activeLookup[id];
		console.log(groupName)
		if(active.has(id)){
			if (!document.getElementById(id.replace(/[^a-zA-Z0-9_]/g, '_')).checked){
				active = this.controller.delActiveSeries(dim,[id]);
				this.activeGroups[groupName] -= 1;
			}
		}
		else{
			if (document.getElementById(id.replace(/[^a-zA-Z0-9_]/g, '_')).checked){
				active = this.controller.addActiveSeries(dim,[id]);
				this.activeGroups[groupName] += 1;
			}
		}
		if (this.activeGroups[groupName] == this.controller.dimensions[dim][groupName].length)
			document.getElementById(groupName.replace(/[^a-zA-Z0-9_]/g,'_')).checked = true;
		else
			document.getElementById(groupName.replace(/[^a-zA-Z0-9_]/g,'_')).checked = false;
	}
	toggleGroup(pLabel, pGroup){
        let active = this.controller.getActiveSeries();
		if (this.activeGroups[pGroup] == this.controller.dimensions[pLabel][pGroup].length){
			if (!document.getElementById(pGroup.replace(/[^a-zA-Z0-9_]/g, '_')).checked){
				for (const series of this.controller.dimensions[pLabel][pGroup]){
					document.getElementById(series.replace(/[^a-zA-Z0-9_]/g, '_')).checked = false;
				}
				active = this.controller.delActiveSeries(pLabel,this.controller.dimensions[pLabel][pGroup]);
				this.activeGroups[pGroup] = 0;
			}
		}
		else{
			if (document.getElementById(pGroup.replace(/[^a-zA-Z0-9_]/g, '_')).checked){
				for (const series of this.controller.dimensions[pLabel][pGroup]){
					document.getElementById(series.replace(/[^a-zA-Z0-9_]/g, '_')).checked = true;
				}
				active = this.controller.addActiveSeries(pLabel,this.controller.dimensions[pLabel][pGroup]);
				this.activeGroups[pGroup] = this.controller.dimensions[pLabel][pGroup].length;
			}
		}

    }
    loadToggle(){
        var parent = this;
        let selects = this.figure.getElementsByTagName('tbody')[0];
        for(var i=0;i<Math.max(this.ops.length, this.wtypes.length);i++){
            let row = document.createElement('tr');
            let units_cell = document.createElement('td');
            let tot_cell = document.createElement('td');
            let op_cell = document.createElement('td');
            let w_cell = document.createElement('td');
            if(i < 3){
                let input = document.createElement('input');
                let label = document.createElement('label');
                if(i == 1){
                    input.id = 'unit-hours';
                    label.setAttribute('for', 'unit-hours');
                    label.innerHTML = 'Labor (Hours)';
                }
                else if(i == 0){
                    input.id = 'unit-days';
                    label.setAttribute('for', 'unit-days');
                    label.innerHTML = 'Duration (Days)';
                }
                else{
                    input.id = 'unit-eff';
                    label.setAttribute('for', 'unit-eff');
                    label.innerHTML = 'Labor Efficiency (%)';
                }
                input.type = 'radio';
                input.className = 'radio';
                input.name = this.figure.id+'_units';
                input.onchange = () => {
                    this.toggleGraphs(input.id);
                    this.toggleChecks(input.id);
                };
                units_cell.appendChild(input);
                units_cell.appendChild(label);
            }
            if(i < 3){
                let input = document.createElement('input');
                let label = document.createElement('label');
                if(i == 0){
                    input.id = 'TOTAL';
                    label.setAttribute('for', 'TOTAL');
                    label.innerHTML = 'TOTAL';
                }
                else if(i == 1){
                    input.id = 'SYSTEM ASSEMBLY';
                    label.setAttribute('for', 'SYSTEM ASSEMBLY');
                    label.innerHTML = 'SYSTEM ASSEMBLY';
                }
                else{
                    input.id = 'SYSTEM TEST';
                    label.setAttribute('for', 'SYSTEM TEST');
                    label.innerHTML = 'SYSTEM TEST';
                }
                input.type = 'checkbox';
                input.className = 'check';
                input.name = 'labor';
                input.onchange = () => this.toggleGraphs(input.id);
                tot_cell.appendChild(input);
                tot_cell.appendChild(label);
            }
            if(i < this.ops.length){
                let input = document.createElement('input');
                let label = document.createElement('label');
                input.id = this.ops[i];
                input.type = 'checkbox';
                input.className = 'check';
                input.name = 'ops';
                input.onchange = () => this.toggleGraphs(input.id);
                label.setAttribute('for', this.ops[i]);
                label.innerHTML = this.ops[i];
                op_cell.appendChild(input);
                op_cell.appendChild(label);
                this.max_hrs_dict[this.ops[i]] = d3.max(this.data, (d) => d[this.ops[i]]);//function(d){ return d[this.ops[i]]; }.bind(this));
                this.assigned_colors[this.ops[i]] = get_colors(i);
            }
            if(i < this.wtypes.length){
                let input = document.createElement('input');
                let label = document.createElement('label');
                input.id = this.wtypes[i];
                input.type = 'checkbox';
                input.className = 'check';
                input.name = 'wtype';
                input.onchange = () => this.toggleGraphs(input.id);
                label.setAttribute('for', this.wtypes[i]);
                label.innerHTML = this.wtypes[i];
                w_cell.appendChild(input);
                w_cell.appendChild(label);
                this.max_hrs_dict[this.wtypes[i]] = d3.max(this.data, (d) => d[this.wtypes[i]]);
                this.assigned_colors[this.wtypes[i]] = get_colors(i);
            }
            row.appendChild(units_cell);
            row.appendChild(tot_cell);
            row.appendChild(op_cell);
            row.appendChild(w_cell);
            selects.appendChild(row);
        }	
	}
	showConfiguration(){
        this.figure.style.display = "block";
        window.onclick = (event) => {
            if(event.target == this.figure){
                this.figure.style.display = "none";
            }
        }
    }
    
    showContext(event){
        this.contextMenu.style.display = 'block';
        window.onclick = () => this.contextMenu.style.display = "none";
        this.contextMenu.style.left = event.pageX+'px';
        this.contextMenu.style.top = event.pageY+'px';
    }

    toggleChecks(id){
        if(id == 'unit-eff'){
            this.figure.querySelector('[id=work_type]').disabled = true;
            this.figure.querySelector('[id=operations]').disabled = true;
            this.figure.querySelectorAll('[name=ops]').forEach((input) => {
                input.disabled = true;
                this.svg.select('#line_'+input.id.replace(/[ /]+/g,'')).remove();
                this.svg.select('#legend_'+input.id.replace(/[ /]+/g,'')).remove();
                this.svg.select('#label_'+input.id.replace(/[ /]+/g,'')).remove();
            });
            this.figure.querySelectorAll('[name=wtype]').forEach((input) => {
                input.disabled = true;
                this.svg.select('#line_'+input.id.replace(/[ /]+/g,'')).remove();
                this.svg.select('#legend_'+input.id.replace(/[ /]+/g,'')).remove();
                this.svg.select('#label_'+input.id.replace(/[ /]+/g,'')).remove();
            });
        }
        else{
            this.figure.querySelectorAll('[class=check_all]').forEach((input) => input.disabled = false);
            this.figure.querySelectorAll('[name=ops]').forEach((input) => input.disabled = false);
            this.figure.querySelectorAll('[name=wtype]').forEach((input) => input.disabled = false);
        }
    }
    
    toggleGraphs(id){
        if(this.xscale.domain().length > this.domain_max){
            this.xAxis.tickFormat((d,i) => {
                if(i != 0 && i != this.data.length-1)
                    return "";
                return d+" "+this.data[i]['team_members'];
            });
        }
        else
            this.xAxis.tickFormat((d,i) => d+" "+this.data[i]['team_members']);
        if(id == 'operations' || id == 'work_type' || id == 'labor_totals'){
            if (this.figure.querySelector('[id='+id+']').checked == true)
                this.checkAll(id, true);
            else{
                this.checkAll(id, false);
            }
        }
        else if(id == 'unit-hours'){
            this.max_dict = this.max_hrs_dict;
            this.units = "hours";
        }
        else if(id == 'unit-eff'){
            this.max_dict = this.max_eff_dict;
            this.units = "eff";
        }
        else if(id == 'unit-days'){
            this.max_dict = this.max_days_dict;
            this.units = "days";
        }
        this.reloadXAxis();
        this.addAxisProperty();
        this.reloadYAxis();
        if (this.figure.querySelector('[id="'+id+'"]').checked == false){
            this.svg.select('#line_'+id.replace(/[ /]+/g,'')).remove();
            this.svg.select('#legend_'+id.replace(/[ /]+/g,'')).remove();
            this.svg.select('#label_'+id.replace(/[ /]+/g,'')).remove();
            if(this.ops.indexOf(id) >= 0)
                this.figure.querySelector('[id=operations]').checked = false;
            else if(this.wtypes.indexOf(id) >= 0)
                this.figure.querySelector('[id=work_type]').checked = false;
            else if(this.labor_totals.indexOf(id) >= 0)
                this.figure.querySelector('[id=labor_totals]').checked = false;
        }
        this.getChecked().forEach((input) => {
            if(this.units == 'eff'){
                if(this.labor_totals.indexOf(input.id) < 0)
                    return;
            }
            this.graphLine(input.id);
            this.loadLegend(input.id);
        });
        if(this.checkSelectAll(this.figure.querySelectorAll('[name=ops]')))
            this.figure.querySelector('[id=operations]').checked = true;
        else
            this.figure.querySelector('[id=operations]').checked = false
        if(checkSelectAll(this.figure.querySelectorAll('[name=wtype]')))
            this.figure.querySelector('[id=work_type]').checked = true;
        else
            this.figure.querySelector('[id=work_type]').checked = false
        if(checkSelectAll(this.figure.querySelectorAll('[name=labor]')))
            this.figure.querySelector('[id=labor_totals]').checked = true;
        else
            this.figure.querySelector('[id=labor_totals]').checked = false
    }
}

function binarySearch(array, value){
	/*
	Precondition: The array to be searched is initialized; the target value is initialized.
	Postcondition: Returns the index of the value if found, otherwise returns the index where the value should be inserted.
	*/
	var left_i = 0;
	var right_i = array.length-1;
	while (left_i <= right_i){
		var curr_i = left_i + Math.floor(right_i - left_i)
		var curr_val = array[curr_i];
		if(curr_val == value)
			return curr_i;
		if(value < curr_val)
			right_i = curr_i-1;
		else
			left_i = curr_i+1;
	}
	return left_i;
}

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



function round(val, dec){
    var m = Math.pow(10, dec || 0);
    return Math.round(val*m)/m;
}

function showData() {
	var x0 = d3.mouse(this)[0];
	var idata = Math.round(x0 / xscale1.range()[xscale1.range().length - 1] * (xscale1.range().length - 1));
}

function get_colors(n){
	/*
	var colors = [
		"#e6194B", 
		"#3cb44b", 
		"#ffe119", 
		"#4363d8", 
		"#f58231", 
		"#911eb4", 
		"#42d4f4", 
		"#f032e6", 
		"#bfef45", 
		"#fabebe", 
		"#469990", 
		"#e6beff", 
		"#9A6324", 
		"#fffac8", 
		"#800000", 
		"#aaffc3", 
		"#808000", 
		"#ffd8b1", 
		"#000075", 
		"#a9a9a9", 
		"#ffffff", 
		//"#000000"
	];
	var colors = [
		"#34293B",
		"#39384E",
		"#3A4960",
		"#365A70",
		"#2E6C7E",
		"#237E88",
		"#1B908F",
		"#22A291",
		"#38B490",
		"#55C58B",
		"#76D583",
		"#9BE47A",
		"#C3F172",
		"#EDFD6B"
	];
	var colors = [
		"#4E2324",
		"#572B37",
		"#58364C",
		"#504460",
		"#40536E",
		"#276274",
		"#0B6F71",
		"#187B66",
		"#3C8456",
		"#618B44",
		"#888F37",
		"#B18F36",
		"#D78C46",
		"#F88864"
	];
	var colors = [
		"#396AB1",
		"#DA7C30",
		"#3E9651",
		"#CC2529",
		"#535154",
		"#6B4C9A",
		"#922428",
		"#948B3D",
	];*/
	var colors = ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c",
		"#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6",
		"#6a3d9a"];
	return colors[n % colors.length];
}