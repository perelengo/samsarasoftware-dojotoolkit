/*-
 * #%L
 * samsarasoftware-dojotoolkit
 * %%
 * Copyright (C) 2014 - 2020 Pere Joseph Rodriguez
 * %%
 * Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 * #L%
 */
define('samsarasoftware/ws/WSDL2Client',
['dojo/_base/declare',
'dojo/_base/lang'
],function(declare,lang){
	var self;

	 return declare('samsarasoftware/ws/WSDL2Client',null, {

		//se permite las siguientes modificaciones:
		//Para cambiar la URL del servicio, hay que modificar el endpoint._options.address
		
		_wsdl_namespace:"http://www.w3.org/ns/wsdl",
		_xs_namespace:"http://www.w3.org/2001/XMLSchema",
		
		
		constructor: function(/*Object*/ args){
		  declare.safeMixin(this, args);
		  self = this;
		  self.alreadyImported={};
		  
		},
		
		wsdlUrl:null,
		actualURL:null,
		
		processWSDL: function (wsdl, wsdlUrl){
			var parser, xmlDoc;
			var serviceDescription={};
			self.wsdlUrl=(wsdlUrl)?wsdlUrl:window.location.href;
			self.actualURL=new Array();
			self.actualURL.push(self.wsdlUrl);
			
			parser = new DOMParser();
			xmlDoc = parser.parseFromString(wsdl,"text/xml");
			
			var w_description=xmlDoc.getElementsByTagNameNS(self._wsdl_namespace, 'description');
			var description=xmlDoc.documentElement.cloneNode(true);
			var targetNamespace=description.getAttribute("targetNamespace");
			
			var targetPrefix=self.getNamespacePrefix(description, targetNamespace);
			
			self.replaceNamespacesRecursive(description,targetPrefix);
			
			self.processImports(description,targetNamespace);
			
			self.description=description;
			
			if(document.location.search.indexOf("debug=true")!=-1)
				self.printDOMTree(description);

			serviceDescription.interfaces=self.processInterfaces(description);
			serviceDescription.bindings=self.processBindings(description,serviceDescription);
			serviceDescription.services=self.processServices(description, serviceDescription);

			return serviceDescription;
		},
		
	
		removeNamespace: function (name){
			return name.substring(name.indexOf(":")+1);
		},
		
		processServices: function (description, serviceDescription){
			var services={};
			
			var nsResolver = document.createNSResolver( description.ownerDocument == null ? description.documentElement : description.ownerDocument.documentElement );
			var xpathResultIterator = document.evaluate( "./wsdl:service", description, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
			var thisNode = xpathResultIterator.iterateNext();
  
			while (thisNode) {
				var name=thisNode.getAttribute("name");
				services[self.removeNamespace(name)]={};
				services[self.removeNamespace(name)].name=name;
				services[self.removeNamespace(name)].interface=serviceDescription.interfaces[thisNode.getAttribute("interface")];
				services[self.removeNamespace(name)].endpoints=self.processEndpoints(thisNode,description, serviceDescription);
				
				thisNode = xpathResultIterator.iterateNext();
			}	
			return services;
		
		},
		
		processEndpoints: function (serviceNode, description, serviceDescription){
			var endpoints={};
			
			var nsResolver = document.createNSResolver( description.ownerDocument == null ? description.documentElement : description.ownerDocument.documentElement );
			var xpathResultIterator = document.evaluate( "./wsdl:endpoint", serviceNode, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
			var thisNode = xpathResultIterator.iterateNext();
  
			while (thisNode) {
				var name=thisNode.getAttribute("name");
				endpoints[self.removeNamespace(name)]={};
				endpoints[self.removeNamespace(name)].name=name;
				endpoints[self.removeNamespace(name)].binding=serviceDescription.bindings[thisNode.getAttribute("binding")];
				endpoints[self.removeNamespace(name)].address=thisNode.getAttribute("address");
				endpoints[self.removeNamespace(name)].stub=self.processStub(endpoints[self.removeNamespace(name)],description,serviceDescription);
				
				//if it is http binding, cal also create html forms to call the endpoint
				if(endpoints[self.removeNamespace(name)].binding.type=="http://www.w3.org/ns/wsdl/http"){
					endpoints[self.removeNamespace(name)].form=self.processForm(endpoints[self.removeNamespace(name)],description,serviceDescription);
				}
				
				endpoints[self.removeNamespace(name)]._options={};
				thisNode = xpathResultIterator.iterateNext();
			}	
			return endpoints;
		
		
		},
		
		processForm: function (endpoint,description,serviceDescription){
			var  stub= {};
			for(var operationName in endpoint.binding.operations){
					var operation=endpoint.binding.operations[operationName];
					if(endpoint.binding.type=="http://www.w3.org/ns/wsdl/http"){
						//styles:
						//http://www.w3.org/ns/wsdl/style/rpc
						//http://www.w3.org/ns/wsdl/style/iri
						//http://www.w3.org/ns/wsdl/style/multipart

						if(operation.style=="http://www.w3.org/ns/wsdl/style/iri"){
							stub[self.removeNamespace(operation.name)]=self.processIRIStyleForm(endpoint,operation,description,serviceDescription);
							
						}else if(operation.style=="http://www.w3.org/ns/wsdl/style/multipart"){
							stub[self.removeNamespace(operation.name)]=self.processMultipartStyleForm(endpoint,operation,description,serviceDescription);
						}else if(operation.style=="http://www.w3.org/ns/wsdl/style/rpc"){
							throw new Error("Can't get a form for operation ("+operation.name+"):HTTP does not define a RPC-call style.");
						}else{
							throw new Error("Unsupported operation style: "+operation.style);
						}
					}else if(endpoint.binding.type="http://www.w3.org/ns/wsdl/json-rpc"){
						//No forms are generated, json-rpc works with stubs
					}else{
						throw new Error("Usupported binding type: "+ endpoint.binding.type);
					}
			}
			
			return stub;

		},
		
		processIRIStyleForm: function (endpoint,operation,description,serviceDescription){
			var func = dojo.hitch(this, "_executeForm",operation,endpoint, 'application/x-www-form-urlencoded');
			return func;
		},
		
		processMultipartStyleForm: function (endpoint,operation,description,serviceDescription){
			var func = dojo.hitch(this, "_executeForm",operation,endpoint, 'multipart/form-data');
			return func;
		},
		
		_executeForm: function (method,endpoint,encType){
			var args = [];
			var i;
			var form=endpoint.form;
			
			for(i=3; i< arguments.length; i++){
				args.push(arguments[i]);
			}
			var request = self._getRequest(method,endpoint,args);
			var f = document.createElement("form");
			f.setAttribute('method',method["whttp:method"]);
			f.setAttribute('action',request.url);
			if(form._options && form._options.target)
				f.setAttribute('target',form._options.target);
			f.setAttribute('enctype',encType);
			
			for(var fieldName in request.data){
				var j = document.createElement("input");
				j.type = "text";
				j.name = fieldName;
				j.value = request.data[fieldName];
				f.appendChild(j);
			}
			if(request.url.indexOf('?')!=-1){
				var separator=(method["whttp:queryParameterSeparator"])?method["whttp:queryParameterSeparator"]:"&";
				var pairs=request.url.split("?")[1].split(separator);
				for(l=0;l<pairs.length;l++){
					var j = document.createElement("input");
					var kv=pairs[l].split("=");
					j.type = "text";
					j.name = kv[0];
					j.value = decodeURIComponent(kv[1]).replace(/[+]/g," ");
					f.appendChild(j);
				}
			}
			
			var s = document.createElement("input");
			s.type = "submit";
			s.value = "Submit";
			f.appendChild(s);

			var d = document.createElement("div");
			d.style.display="none";
			d.appendChild(f);
			
			if(form._options && form._options.container)
				form._options.container.formContainer.appendChild(d).childNodes[0].submit();
			else
				document.getElementsByTagName('body')[0].appendChild(d).childNodes[0].submit();
		},
		
		processStub: function (endpoint,description,serviceDescription){
			
			var  stub= {};
			for(var operationName in endpoint.binding.operations){
					var operation=endpoint.binding.operations[operationName];
					if(endpoint.binding.type=="http://www.w3.org/ns/wsdl/http"){
						//styles:
						//http://www.w3.org/ns/wsdl/style/rpc
						//http://www.w3.org/ns/wsdl/style/iri
						//http://www.w3.org/ns/wsdl/style/multipart

						if(operation.style=="http://www.w3.org/ns/wsdl/style/iri"){
							stub[self.removeNamespace(operation.name)]=self.processIRIStyleOperation(endpoint,operation,description,serviceDescription);
							
						}else if(operation.style=="http://www.w3.org/ns/wsdl/style/multipart"){
							stub[self.removeNamespace(operation.name)]=self.processMultipartStyleOperation(endpoint,operation,description,serviceDescription);
						}else if(operation.style=="http://www.w3.org/ns/wsdl/style/rpc"){
							//stub[self.removeNamespace(operation.name)]=null;//
							throw new Error("Can't get a stub for operation ("+operation.name+"):HTTP does not define a RPC-call style.");
						}else{
							throw new Error("Unsupported operation style: "+operation.style);
						}
					}else if(endpoint.binding.type="http://www.w3.org/ns/wsdl/json-rpc"){
						self._requestId=0;
						stub[self.removeNamespace(operation.name)]=self.processJsonRpcStyleOperation(endpoint,operation,description,serviceDescription);
					}else{
						throw new Error("Usupported binding type: "+ endpoint.binding.type);
					}
			}
			
			return stub;
		},
		processJsonRpcStyleOperation: function (endpoint,operation,description,serviceDescription){
			var func = dojo.hitch(this, "_executeJsonRpcMethod",operation,endpoint);
			return func;
		},
		
		_executeJsonRpcMethod: function (method,endpoint){
			var args = [];
			var i;
						
			for(i=2; i< arguments.length; i++){
				args.push(arguments[i]);
			}
			var request = self._getJsonRpcRequest(method,endpoint,args);
			var promise;
			
			var deserializeFunc=function(method,endpoint,results){
				if(results instanceof Error)
					return request._envDef.deserialize.call(request._envDef,[method, endpoint,results.response]);
				else
					return request._envDef.deserialize.call(request._envDef,[method, endpoint,results]);

			};

			if(endpoint.binding["wjsonrpc:protocol"]=="http://www.w3.org/ns/wsdl/http"){
				promise = samsarasoftware.jsonrpc.transportRegistry.match( method["whttp:method"] || "POST" ).fire(request);
				promise=promise.then(
					lang.partial(deserializeFunc, method,endpoint)
					,
					lang.partial(deserializeFunc, method, endpoint)
				);
			}else{
				//FIXME
				throw new Error("Only jsonrpc:protocol=\"http://www.w3.org/ns/wsdl/http\" is supported actually");
			}

			return promise;
		},

		_getJsonRpcRequest: function _getRequest(method,endpoint,args){
			var protocolVersion=(endpoint.binding["wjsonrpc:protocol-version"] || "2.0");
			var envDef = samsarasoftware.jsonrpc.envelopeRegistry.match("JSON-RPC-"+protocolVersion);
			var methodParamsXsd=self.getTypeHierarchyAttributes(method.messages["wsdl:input"][0].type);
			
			//FIXME Pendiente de terminar
			var method2={"name":self.removeNamespace(method.name)};
			var request = envDef.serialize.apply(this, [endpoint,method2, args]);
			request._envDef = envDef;// save this for executeMethod
			
						
		
			// this allows to mandate synchronous behavior from elsewhere when necessary, this may need to be changed to be one-shot in FF3 new sync handling model
			var out= dojo.mixin(request, {
				target: (endpoint._options.address || endpoint.address)
				,sync: (endpoint._options.sync!=null || samsarasoftware.ws.sync!=null )?(endpoint._options.sync || samsarasoftware.ws.sync):false
				
			});
			if((endpoint._options.sync!=null || samsarasoftware.ws.sync!=null )&& !endpoint._options.sync){
				out.timeout= endpoint._options.timeout;
			}
			return out;
		},
		
		processIRIStyleOperation: function (endpoint,operation,description,serviceDescription){
			var func = dojo.hitch(this, "_executeMethod",operation,endpoint);
			return func;
		},
		
		_executeMethod: function (method,endpoint){
			var args = [];
			var i;
						
			for(i=2; i< arguments.length; i++){
				args.push(arguments[i]);
			}
			var request = self._getRequest(method,endpoint,args);
			var deserializeFunc=function(method,endpoint,results){
				if(results instanceof Error)
					return request._envDef.deserialize.call(request._envDef,[method, endpoint,results.response]);
				else
					return request._envDef.deserialize.call(request._envDef,[method, endpoint,results]);
			};
			var promise = samsarasoftware.ws.transportRegistry.match(method["whttp:method"]).fire(request);
			promise=promise.then(
				lang.partial(deserializeFunc, method,endpoint)
				, lang.partial(deserializeFunc, method, endpoint)
			);
			return promise;
		},
		getTypeHierarchyAttributes: function(type,description){
			if(type.children[0].localName.toLowerCase()=="sequence"){
				return type.children[0].children; 
			}else{
				if(type.children[0].localName.toLowerCase()=="complexcontent"){
					var res=new Array();
					res.concat(type.children[0].children[0].children[0].children);
					var parentName=type.children[0].children[0].getAttribute("base");
					
					var nsResolver2 = document.createNSResolver( description.ownerDocument == null ? description.documentElement : description.ownerDocument.documentElement );
					var xpathResultIterator2 = document.evaluate( "//xs:complexType[@name='"+parentName+"']", description, nsResolver2, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
					var elementReference = xpathResultIterator2.iterateNext();
	  
					if(elementReference==null) throw new Error("Cannot find element with name "+parentName);
					if(xpathResultIterator2.iterateNext()!=null)  throw new Error("Found more than one element with name "+parentName);
					
					
					var parentType=elementReference;
					res.concat(self.getTypeHierarchyAttributes(parentType));
					return res;
				}else{
					throw new Error("Unsupported element: "+type.children[0]);
				}	
			}
		},
		getComplexType: function(typeName,description){
			var res=new Array();
			var res=new Array();
			
			var nsResolver2 = document.createNSResolver( description.ownerDocument == null ? description.documentElement : description.ownerDocument.documentElement );
			var xpathResultIterator2 = document.evaluate( "//xs:complexType[@name='"+typeName+"']", description, nsResolver2, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
			var elementReference = xpathResultIterator2.iterateNext();

			if(elementReference==null) throw new Error("Cannot find element with name "+typeName);
			if(xpathResultIterator2.iterateNext()!=null)  throw new Error("Found more than one element with name "+typeName);
			
			return elementReference;
		},
		_getRequest: function (method,endpoint,args){
			var i;
			var envDef = samsarasoftware.ws.envelopeRegistry.match(method.style);
			
			self._getRequest2(method,endpoint,args);

			var request = envDef.serialize.apply(this, [endpoint,method, args]);
			request._envDef = envDef;// save this for executeMethod
			
			
		
			// this allows to mandate synchronous behavior from elsewhere when necessary, this may need to be changed to be one-shot in FF3 new sync handling model
			var out= dojo.mixin(request, {
				target: (endpoint._options.address || endpoint.address)
				,sync: (endpoint._options.sync!=null || samsarasoftware.ws.sync!=null )?(endpoint._options.sync || samsarasoftware.ws.sync):false
				
			});
			if((endpoint._options.sync!=null || samsarasoftware.ws.sync!=null )&& !endpoint._options.sync){
				out.timeout= endpoint._options.timeout;
			}
			return out;
		},
		
		_getRequest2: function (method,endpoint, args){
			// the serializer is expecting named params
			var args2=new Array();

			if(method.messages["wsdl:input"][0].type.children[0].localName.toLowerCase()=="sequence"){
				args2=args;
			}else{
				args2.push(args);
			}
				
			var methodMessagesXsd=self.getTypeHierarchyAttributes(method.messages["wsdl:input"][0].type,self.description);
			if(methodMessagesXsd.length>0){
				var methodMessagesXsdType=self.getComplexType(methodMessagesXsd[0].getAttribute("type"),self.description);
				var methodParamsXsd= methodMessagesXsdType.children[0].children;
				
				for(var j=0;j<args2.length;j++){
					if((args2[j].length==1) && dojo.isObject(args2[j])){
						// looks like we have what we want
						args2[j] = args2[j][0];
					}else{
						// they provided ordered, must convert
						var data={};
						for(var i=0;i<methodParamsXsd.length;i++){
							//if(typeof args2[j][i] != "undefined" || !method.params[i].optional){
								data[self.removeNamespace(methodParamsXsd[i].attributes["name"].value)]=args2[j][i];
							//}
						}
						args2[j] = data;
					}
					
					if(!method["whttp:ignoreUncited"]=="true"){
						//remove any properties that were not defined
						for(i in args2[j]){
							var found=false;
							for(var j=0; j<methodParamsXsd.length;j++){
								if(self.removeNamespace(methodParamsXsd[j].attributes["name"].value)==i){ found=true; }
							}
							if(!found){
								delete args2[j][i];
							}
						}

					}
					// setting default values
					for(i=0;i<methodParamsXsd.length;i++){
						var param = methodParamsXsd[i];
						var paramName=self.removeNamespace(methodParamsXsd[i].attributes["name"].value);
						if(param.attributes["minOccurs"] && param.attributes["minOccurs"].value!="0" && !args2[j][paramName]){
							if(param.attributes["default"]){
								args2[j][paramName] = param.attributes["default"].value;
							}else if(!(paramName in args2[j])){
								throw new Error("Required parameter " + paramName + " was omitted");
							}
						}
					}	
				}
			}
			
		},
		
		processBindings: function (description, serviceDescription){
			var bindings={};
			
			var nsResolver = document.createNSResolver( description.ownerDocument == null ? description.documentElement : description.ownerDocument.documentElement );
			var xpathResultIterator = document.evaluate( "./wsdl:binding", description, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
			var thisNode = xpathResultIterator.iterateNext();
  
			while (thisNode) {
				
				var name=thisNode.getAttribute("name");

				bindings[name]={};
				bindings[name].type=thisNode.getAttribute("type");
				bindings[name].interface=serviceDescription.interfaces[thisNode.getAttribute("interface")];
				bindings[name].operations=self.processBindingOperations(thisNode,bindings[name].interface,description,  bindings[name]);
				if(thisNode.getAttribute("wjsonrpc:protocol")){
					bindings[name]["wjsonrpc:protocol"]=thisNode.getAttribute("wjsonrpc:protocol");
				}
				thisNode = xpathResultIterator.iterateNext();
			}	
			return bindings;
		
		},
		
		processInterfaces: function (description){
			var interfaces={};
			
			var nsResolver = document.createNSResolver( description.ownerDocument == null ? description.documentElement : description.ownerDocument.documentElement );
			var xpathResultIterator = document.evaluate( "./wsdl:interface", description, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
			var thisNode = xpathResultIterator.iterateNext();
  
			while (thisNode) {
				var name=thisNode.getAttribute("name");
				var interface={};
				interface.name=name;
				interface.operations=self.processOperations(thisNode,description);
				interfaces[name]=interface;
				thisNode = xpathResultIterator.iterateNext();
			}	
			return interfaces;
		},
		
		processBindingOperations: function (interfaceNode, interface, description,  binding){
			var operations={};
			
			var nsResolver = document.createNSResolver( description.ownerDocument == null ? description.documentElement : description.ownerDocument.documentElement );
			var xpathResultIterator = document.evaluate( "./wsdl:operation", interfaceNode, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
			var thisNode = xpathResultIterator.iterateNext();
  
			while (thisNode) {
				var opRef=thisNode.getAttribute("ref");
				var operation=JSON.parse(JSON.stringify(interface.operations[opRef])); //clone except DOM nodes
				operation.messages=interface.operations[opRef].messages;

				operation["whttp:method"]=thisNode.getAttribute("whttp:method");
				operation["whttp:location"]=thisNode.getAttribute("whttp:location");
				operation["whttp:ignoreUncited"]=thisNode.getAttribute("whttp:ignoreUncited");
				operation["whttp:inputSerialization"]=thisNode.getAttribute("whttp:inputSerialization");
				operation["whttp:outputSerialization"]=thisNode.getAttribute("whttp:outputSerialization");
				operation["whttp:faultSerialization"]=thisNode.getAttribute("whttp:faultSerialization");
				operation["whttp:queryParameterSeparatorDefault"]=thisNode.getAttribute("whttp:queryParameterSeparatorDefault");
				operation["whttp:queryParameterSeparator"]=thisNode.getAttribute("whttp:queryParameterSeparator");
				if(!operation["whttp:queryParameterSeparator"]) operation["whttp:queryParameterSeparator"]=operation["whttp:queryParameterSeparatorDefault"];
				if(!operation["whttp:queryParameterSeparator"]) operation["whttp:queryParameterSeparator"]="&";
				operation["queryToObject"]=dojo.hitch(self, "queryToObject", operation);
				operations[self.removeNamespace(operation.name)]=operation;
				
				thisNode = xpathResultIterator.iterateNext();
			}
			
			return operations;
		},
		transformTypes:function(orig, schema){
			var obj=JSON.parse(JSON.stringify(orig)); //clone
			
			for(key in schema){
				if(schema[key] instanceof Number){
					if(obj[key] && !(obj[key] instanceof Number) && (schema[key] instanceof String) )
						obj[key]=new Number(obj[key]);
				}else if(schema[key] instanceof String){
					if(obj[key] && !(obj[key] instanceof String) && (schema[key] instanceof String) )
						obj[key]=new String(obj[key]);
				}else if(schema[key] instanceof Boolean){
					if(obj[key] && !(obj[key] instanceof Boolean) && (schema[key] instanceof String) )
						obj[key]=new Number(obj[key]);
				}else if(schema[key] instanceof Date){
					if(obj[key] && !(obj[key] instanceof Date) && (schema[key] instanceof Date) )
						obj[key]=new Date(obj[key]);
				}else if(Array.isArray(schema[key])){
					if(obj[key] && !(Array.isArray(obj[key])) && (Array.isArray(schema[key])) ){}
						obj[key]=self.transformArrayTypes(obj[key],schema[key]);					
				}else if(typeof schema[key] == "number"){
					if(obj[key] && !(typeof obj[key] == "number") && (typeof schema[key] == "number") )
						obj[key]=parseFloat(obj[key]);
				}else if(typeof schema[key] == "boolean"){
					if(obj[key] && !(typeof obj[key] == "boolean") && (typeof schema[key] == "boolean") )
						obj[key]=parseBoolean(obj[key]);
				}else if(typeof schema[key] == "string"){
					if(obj[key] && !(typeof obj[key] == "string") && (typeof schema[key] == "string") )
						obj[key]=""+obj[key];
				}else if(schema[key] instanceof Object){
					if(obj[key] && (schema[key] instanceof Object) && (schema[key] instanceof Object) )
						obj[key]=self.transformTypes(obj[key],schema[key]);					
				}
			}
			return obj;
		},
		transformArrayTypes:function(orig,schema){
			var obj=JSON.parse(JSON.stringify(orig)); //clone
			var key=0;
			if(schema.length>0){
				for(key=0;key<obj.length;key++){
					var desiredType=(schema.length>1)?schema[key]:schema[0];
					
					if(desiredType instanceof Number){
						if(obj[key] && !(obj[key] instanceof Number) && (desiredType instanceof String) )
							obj[key]=new Number(obj[key]);
					}else if(desiredType instanceof String){
						if(obj[key] && !(obj[key] instanceof String) && (desiredType instanceof String) )
							obj[key]=new String(obj[key]);
					}else if(desiredType instanceof Boolean){
						if(obj[key] && !(obj[key] instanceof Boolean) && (desiredType instanceof String) )
							obj[key]=new Number(obj[key]);
					}else if(desiredType instanceof Date){
						if(obj[key] && !(obj[key] instanceof Date) && (desiredType instanceof Date) )
							obj[key]=new Date(obj[key]);
					}else if(Array.isArray(desiredType)){
						if(obj[key] && !(Array.isArray(obj[key])) && (Array.isArray(desiredType)) ){}
							obj[key]=self.transformArrayTypes(obj[key],desiredType);					
					}else if(typeof desiredType == "number"){
						if(obj[key] && !(typeof obj[key] == "number") && (typeof desiredType == "number") )
							obj[key]=parseFloat(obj[key]);
					}else if(typeof desiredType == "boolean"){
						if(obj[key] && !(typeof obj[key] == "boolean") && (typeof desiredType == "boolean") )
							obj[key]=parseBoolean(obj[key]);
					}else if(typeof desiredType == "string"){
						if(obj[key] && !(typeof obj[key] == "string") && (typeof desiredType == "string") )
							obj[key]=""+obj[key];
					}else if(desiredType instanceof Object){
						if(obj[key] && !(desiredType instanceof Object) && (desiredType instanceof Object) )
							obj[key]=self.transformTypes(obj[key],desiredType);					
					}
				}
			}
			return obj;
		},
		queryToObject:function(operation,endpoint,uri){
			var queryObject={};
			var wsdlLocation=operation["whttp:location"];
			if(wsdlLocation==null){
				throw new Error("The operation "+operation.name+" has not defined the attribute 'whttp:location'. It must be a \"http://www.w3.org/ns/wsdl/http\" binding's type operation." );
			}
			var wsdlParams_temp=wsdlLocation.split("{");
			var i=0;
			for(i=1;i<wsdlParams_temp.length;i++){
				queryObject[wsdlParams_temp.split("}")[0]]=null;
			}

			var methodParamsXsd=operation.messages["wsdl:input"][0].type.children[0].children;

			if(operation["whttp:ignoreUncited"] || operation["whttp:ignoreUncited"]=="false"){
				for(i=0;i<methodParamsXsd.length;i++){
					var pName=self.removeNamespace(methodParamsXsd[i].attributes["name"].value);
					if(!queryObject.hasOwnProperty(pName)){
						queryObject[pName]=null;
					}
				}

			}
			var address=(endpoint._options.address || endpoint.address);
			if(!address.startsWith("http")){
				if(address.startsWith("/")){
					address=window.location.protocol+"//"+window.location.hostname+":"+window.location.port+address;
				}else{
					address=window.location.href.substring(0,window.location.href.lastIndexOf("/")+1)+address;
				}
			}
			var uriLocation=uri.replace(address,"");
			if(wsdlLocation.startsWith("/") && !uriLocation.startsWith("/")){
				wsdlLocation=wsdlLocation.substring(1);
			}
			//parse path params
			var uriParsingPending=uriLocation;
			if(wsdlParams_temp.length>1){
				for(i=0;i<wsdlParams_temp.length;i++){
					if(uriParsingPending.startsWith(wsdlParams_temp[i])){
						var temp=wsdlParams_temp[i].split("}");
						if(temp[1]!="" && uriParsingPending.indexOf(temp[1])!=-1){
							if(temp[1]==""){
								if(uriParsingPending.indexOf("?")!=-1){
									//COnvert to object
									queryObject[temp[0]]=stringToXsdObject(
										decodeURIComponent(
											uriParsingPending.substring(0,uriParsingPending.indexOf("?"))
										).replace(/[+]/g," ")
										,temp[0]
										,methodParamsXsd);
									//finished expected path string ??
									uriParsingPending.substring(uriParsingPending.indexOf("?"));
								}else{
									queryObject[temp[0]]=stringToXsdObject(
										decodeURIComponent(uriParsingPending)
										.replace(/[+]/g," ")
										,temp[0]
										,methodParamsXsd);
									break; //finished expected path string ??
								}
							}else{
								queryObject[temp[0]]=stringToXsdObject(
										decodeURIComponent(
											uriParsingPending.substring(0,uriParsingPending.indexOf(temp[1]))
										).replace(/[+]/g," ")
										,temp[0]
										,methodParamsXsd);
								uriParsingPending=uriParsingPending.substring(uriParsingPending.indexOf(temp[1])+temp[1].length);
							}
						}else{
							throw new Error("Error parsing parameters. Found:'"+uriParsingPending+"' Expected:{'"+wsdlParams_temp[i]+"'");
						}
					}else{
						if(uriParsingPending.startsWith("?") || uriParsingPending==""){
							break; //end of path parameters
						}else{
							throw new Error("Error parsing parameters. Found:'"+uriParsingPending+"' Expected:'"+wsdlParams_temp[i]+"'");
						}
					}
				}
			}else{
				if(uriParsingPending.length>wsdlParams_temp[0].length)
					uriParsingPending=uriParsingPending.substring(wsdlParams_temp[0].length);
				else
					uriParsingPending="";
			}
			//parse query params
			if(uriParsingPending.startsWith("?")){
				uriParsingPending=uriParsingPending.substring(1);
				var queryParams=uriParsingPending.split(operation["whttp:queryParameterSeparator"]);
				for(i=0;i<queryParams.length;i++){
					var pKV=queryParams[i].split("=");
					if(queryObject.hasOwnProperty(pKV[0])){
						if(pKV.length==1)
							queryObject[pKV[0]]=true;
						else
							//COnvert to object
							queryObject[pKV[0]]=self.stringToXsdObject(
								decodeURIComponent(pKV[1])
								.replace(/[+]/g," ")
								,pKV[0]
								,methodParamsXsd);
					}
				}
			}
			return queryObject;
		},
		
		stringToXsdObject:function(str,attributeName,attributeSequence){
			var i=0;
			for(i=0;i<attributeSequence.length;i++){
				if(attributeName==self.removeNamespace(attributeSequence[i].attributes["name"].value)){
					var xsdType=attributeSequence[i].attributes["type"].value;
					var val=self.parsePrimaryXSDType(str,xsdType);
					if(!val){
						//check referenced type
						var typeName=xsdType;
						var nsResolver1 = document.createNSResolver( self.description.ownerDocument == null ? self.description.documentElement : self.description.ownerDocument.documentElement );
						var xpathResultIterator1 = document.evaluate( "//*[@name='"+typeName+"']", self.description, nsResolver1, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
						var typeReference = xpathResultIterator1.iterateNext();
						
						if(typeReference==null) throw new Error("Cannot find type with name "+typeName);
						if(xpathResultIterator1.iterateNext()!=null)  throw new Error("Found more than one type with name "+typeName);
						if(typeReference.nodeName=="xs:simpleType"){
							var nsResolver2 = document.createNSResolver( self.description.ownerDocument == null ? self.description.documentElement : self.description.ownerDocument.documentElement );
							var xpathResultIterator2 = document.evaluate( "./xs:restriction", typeReference, nsResolver2, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
							var restrictionReference = xpathResultIterator2.iterateNext();
							
							if(restrictionReference==null) throw new Error("Current element "+typeName+" is not a xs:restricion element");
							if(xpathResultIterator2.iterateNext()!=null)  throw new Error("Found more than one xs:restriction in node "+typeName);
							var subType=restrictionReference.attributes["base"].value;
							
							val=self.parsePrimaryXSDType(str,subType);
						}else{
							return JSON.parse(str);
						}
					}
					return val;
				}
			}
		},
		parsePrimaryXSDType:function(str,xsdType){
					if(xsdType=="xs:string"){
						return str;						
					}else if(xsdType=="xs:integer"){
						return parseInt(str);
					}else if(xsdType=="xs:long"){
						return parseInt(str);
					}else if(xsdType=="xs:decimal"){
						return parseFloat(str);
					}else if(xsdType=="xs:boolean"){
						return (str=="true");
					}else if(xsdType=="xs:dateTime"){
						return new Date(str);
					}else if(xsdType=="xs:date"){
						return new Date(str);
					}else if(xsdType=="xs:base64Binary"){
						throw new Error("Unsupported type xsd:base64Binary");
					}else{			
						return null;
					}
		},
		processBindingOperationHttpHeaders: function (messages){
			messages;
		},
		
		processOperations: function (interfaceNode,description){
			var operations={};
			
			var nsResolver = document.createNSResolver( description.ownerDocument == null ? description.documentElement : description.ownerDocument.documentElement );
			var xpathResultIterator = document.evaluate( "./wsdl:operation", interfaceNode, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
			var thisNode = xpathResultIterator.iterateNext();
  
			while (thisNode) {
				var name=thisNode.getAttribute("name");
				var pattern=thisNode.getAttribute("pattern");
				var style=thisNode.getAttribute("style");
				var safe=thisNode.getAttribute("wsdlx:safe");
				
				operations[name]={
					"name":name
					,"style":style
					,"safe":safe
				};
				
				operations[name].messages=self.processOperationMessages(thisNode,description);
				
				thisNode = xpathResultIterator.iterateNext();
			}
			
			return operations;
		},
		
		processOperationMessages: function (operation,description){
			var messages={};
			
			var i=0;
			var paramCounter=0;
			
			for(i=0;i<operation.childNodes.length;i++){
				var thisNode=operation.childNodes[i];
				var type=tagName=thisNode.tagName;
				
				//solo procesamos parametros input output infault y outfault
				if(!thisNode.tagName || (tagName!="wsdl:input"&& tagName!="wsdl:output" && tagName!="wsdl:infault" && tagName!="wsdl:outfault" ))
					continue;
				
				paramCounter++;
				
				var elementName=(thisNode.getAttribute("element"))?thisNode.getAttribute("element"):thisNode.getAttribute("ref"); //faults are referenced with ref attrib
				
				if(thisNode.nodeName.indexOf("fault")!=-1){
					var nsResolver2 = document.createNSResolver( description.ownerDocument == null ? description.documentElement : description.ownerDocument.documentElement );
					var xpathResultIterator2 = document.evaluate( "//wsdl:fault[substring(@name, string-length(@name) - string-length('"+elementName+"') +1) = '"+elementName+"']", description, nsResolver2, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
					var faultReference = xpathResultIterator2.iterateNext();
	  
					if(faultReference==null) 
						throw new Error("Cannot find element with name "+elementName);
					if(xpathResultIterator2.iterateNext()!=null)  
						throw new Error("Found more than one element with name "+elementName);

					elementName=(faultReference.getAttribute("element"))?faultReference.getAttribute("element"):thisNode.getAttribute("ref"); //faults are referenced with ref attrib
				}
				var nsResolver3 = document.createNSResolver( description.ownerDocument == null ? description.documentElement : description.ownerDocument.documentElement );
				var xpathResultIterator3 = document.evaluate( "//xs:element[@name='"+elementName+"']", description, nsResolver3, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
				var elementReference = xpathResultIterator3.iterateNext();
  
				if(elementReference==null) throw new Error("Cannot find element with name "+elementName);
				if(xpathResultIterator3.iterateNext()!=null)  
					throw new Error("Found more than one element with name "+elementName);

				var typeName=elementReference.attributes["type"].value;
				var nsResolver4 = document.createNSResolver( description.ownerDocument == null ? description.documentElement : description.ownerDocument.documentElement );
				var xpathResultIterator4 = document.evaluate( "//*[@name='"+typeName+"']", description, nsResolver4, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
				var typeReference = xpathResultIterator4.iterateNext();
				
				if(typeReference==null) throw new Error("Cannot find type with name "+typeName);
				if(xpathResultIterator4.iterateNext()!=null)  
					throw new Error("Found more than one type with name "+typeName);
  
				var messageLabel=self.getMessageLabel(thisNode,paramCounter,thisNode.tagName,operation);
				
				if(!messages[thisNode.tagName])
					messages[thisNode.tagName]=new Array();
					
				messages[thisNode.tagName].push({
					element: elementReference
					,type: typeReference
					,operation: operation
					,messageLabel:messageLabel
				});
				//FIXME pending headers
				
			}
			
			return messages;
		
		},
		
		getMessageLabel: function (paramNode,paramCounter,tagName, operation){
			//predefined https://www.w3.org/TR/2007/REC-wsdl20-adjuncts-20070626/#meps
			//additional MEPs https://www.w3.org/TR/2007/NOTE-wsdl20-additional-meps-20070626/
			
			if(paramNode.getAttribute("messageLabel")) {
				return paramNode.getAttribute("messageLabel");
			}else{
				var pattern=operation.getAttribute("pattern");
				if(pattern=="http://www.w3.org/ns/wsdl/in-only"){
					if(paramCounter==1) return "In"; else throw new Error("Method does not comply in-out message exchange-pattern.");
				}else if(pattern=="http://www.w3.org/ns/wsdl/robust-in-only"){
					if(paramCounter==1) return "In"; else "Out";
				}else if(pattern=="http://www.w3.org/ns/wsdl/in-out"){
					if(paramCounter==1) return "In"; else "Out";
				}else if(pattern=="http://www.w3.org/ns/wsdl/in-opt-out"){
					if(paramCounter==1) return "In"; else "Out";
				//FIXME }else if(pattern=="http://www.w3.org/ns/wsdl/out-only"){
				//FIXME }else if(pattern=="http://www.w3.org/ns/wsdl/robust-out-only"){
				//FIXME }else if(pattern=="http://www.w3.org/ns/wsdl/out-in"){
				//FIXME }else if(pattern=="http://www.w3.org/ns/wsdl/out-opt-in"){
				
				}else{
					return null;
				}
				
			}
		},
		
		wsdlRelative2documentRelative: function(wsdlUrl, xsdRelativeURL){
				var wsdlAbsolute;
				var xsdAbsolute2wsdl;
				var finalURL='';
				if(!xsdRelativeURL.startsWith('http')){
					if(!wsdlUrl.startsWith('http')){
						wsdlAbsolute=new URL(wsdlUrl,window.location.href).toString();
					}else{
						wsdlAbsolute=wsdlUrl;
					}
					var xsdRelative2wsdl = new URL(xsdRelativeURL,wsdlAbsolute).toString();	
					var xa=xsdRelative2wsdl.split('/');
					var da=window.location.href.split('/');
					var i;
					var breakPos=-1;
					for(i=2;i<da.length;i++){ // ignore http[s]://
						if(da[i]!=xa[i]){
							breakPos=i;
							var j=0;
							for(j=0;j<da.length-breakPos-1;j++){
								finalURL+='../';
							}
							for(j=breakPos;j<xa.length-1;j++){
								finalURL+=xa[j]+'/';
							}
							break;
						}
					}
					if(breakPos==-1){
						return xsdRelative2wsdl;
					}else{
						return new URL(finalURL+xa[xa.length-1],window.location.href).toString();
					}
				}else{
					return xsdRelativeURL;
				}
		},
		
		processImports: function (description,targetNamespace){
			var replaces=new Array();
			
			var nsResolver = document.createNSResolver( description.ownerDocument == null ? description.documentElement : description.ownerDocument.documentElement );
			var xpathResultIterator = document.evaluate( "//xs:import", description, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
			var thisNode = xpathResultIterator.iterateNext();
  
			while (thisNode) {
				var xsdRelativeURL=thisNode.getAttribute("schemaLocation");
				var url = self.wsdlRelative2documentRelative(self.actualURL[self.actualURL.length-1],xsdRelativeURL);
				var namespace=thisNode.getAttribute("namespace");


				var namespacePrefix=self.getNamespacePrefix(description,namespace);
				if(self.alreadyImported[url.toString()]){
					thisNode = xpathResultIterator.iterateNext();
					continue;
				}
					
				
				var importedDocument= new DOMParser().parseFromString(dojo._getText(url),"text/xml");
				var w_description2=importedDocument.documentElement;
				var description2=w_description2.cloneNode(true);
				self.alreadyImported[url.toString()]=url;
				self.actualURL.push(url);
				self.processImports(description2,namespacePrefix);
				self.actualURL.pop();
				description2.setAttribute("effectiveNamespace",namespace);
				var parent=thisNode.parentNode;
				replaces.push([parent,description2, thisNode,namespacePrefix]);

				thisNode = xpathResultIterator.iterateNext();
			}	

			
			var i;
			for(i=0;i<replaces.length;i++){
				//printDOMTree(description);
				self.replaceNamespacesRecursive(replaces[i][1],replaces[i][3]);
				
				
				var j;
				replaces[i][0].removeChild(replaces[i][2]);
				while(replaces[i][1].childNodes.length>0){
					replaces[i][0].appendChild(replaces[i][1].childNodes[0]);
				}
				//printDOMTree(description);
			}
				
		
		},
		
		getNamespacePrefix: function (description,namespace){
				var i,namespaceDeclarationNode=null;
				
				for(i=0;i<description.attributes.length;i++){
					if(description.attributes[i].name.startsWith('xmlns:') && description.attributes[i].value==namespace){
						 namespaceDeclarationNode=description.attributes[i];
						 break;
					}
				}
				
				var namespacePrefix=(namespaceDeclarationNode)?namespaceDeclarationNode.name.substring(6):null;
				return namespacePrefix;
		},
		
		replaceNamespacesRecursive: function (currentElement, targetNamespacePrefix){
			if (currentElement) {
				var j;
				
				if(targetNamespacePrefix && currentElement instanceof Element && currentElement.getAttribute("name") && currentElement.getAttribute("name").indexOf(":")==-1){
					currentElement.setAttribute("name", targetNamespacePrefix+":"+currentElement.getAttribute("name"));
				}

				// Traverse the tree
				var i = 0;
				var currentElementChild = currentElement.childNodes[i];
				while (currentElementChild) {
					// Recursively traverse the tree structure of the child node
					self.replaceNamespacesRecursive(currentElementChild, targetNamespacePrefix);
					i++;
					currentElementChild=currentElement.childNodes[i];
				}
			}
			
		},

		
		
		
		traverseDOMTree: function (targetDocument, currentElement, depth) {
			if (currentElement) {
			  var j;
			  var tagName = currentElement.tagName;
			  // Prints the node tagName, such as <A>, <IMG>, etc
			  if (tagName)
				targetDocument.writeln("&lt;"+currentElement.tagName+"&gt;");
			  else
				targetDocument.writeln("[unknown tag]");

				if(currentElement.attributes){
				  var t=0;
				  for(t=0;t<currentElement.attributes.length;t++){
					targetDocument.write("&nbsp;&nbsp;"+currentElement.attributes[t].name+"="+currentElement.attributes[t].value);
				  }
				}
			  // Traverse the tree
			  var i = 0;
			  var currentElementChild = currentElement.childNodes[i];
			  while (currentElementChild) {
				// Formatting code (indent the tree so it looks nice on the screen)
				targetDocument.write("<BR>\n");
				for (j = 0; j < depth; j++) {
				  // &#166 is just a vertical line
				  targetDocument.write("&nbsp;&nbsp;&#166");
				}               
				targetDocument.writeln("<BR>");
				for (j = 0; j < depth; j++) {
				  targetDocument.write("&nbsp;&nbsp;&#166");
				}         
				if (tagName)
				  targetDocument.write("--");

				// Recursively traverse the tree structure of the child node
				self.traverseDOMTree(targetDocument, currentElementChild, depth+1);
				i++;
				currentElementChild=currentElement.childNodes[i];
			  }
			  // The remaining code is mostly for formatting the tree
			  targetDocument.writeln("<BR>");
			  for (j = 0; j < depth - 1; j++) {
				targetDocument.write("&nbsp;&nbsp;&#166");
			  }     
			  targetDocument.writeln("&nbsp;&nbsp;");
			  if (tagName)
				targetDocument.writeln("&lt;/"+tagName+"&gt;");
			}
		},

		printDOMTree: function (domElement, destinationWindow) {
			var outputWindow = destinationWindow;
			if (!outputWindow)
			  outputWindow = window.open();

			outputWindow.document.open("text/html", "replace");
			outputWindow.document.write("<HTML><HEAD><TITLE>DOM</TITLE></HEAD><BODY>\n");
			outputWindow.document.write("<CODE>\n");
			self.traverseDOMTree(outputWindow.document, domElement, 1);
			outputWindow.document.write("</CODE>\n");
			outputWindow.document.write("</BODY></HTML>\n");

			outputWindow.document.close();
		} 
	  
	});	

});
	
	
//////////////////////////////////////			
require(["dojox/rpc/Service",
"dojo/AdapterRegistry", 
"dojo/request/xhr",
"dojo/request/handlers",
"samsarasoftware/rpc/JsonRpc2EnvelopeHandler",
"dojo/Deferred",
"dojo/promise/Promise"],function(Service, AdapterRegistry, xhr, handlers,JsonRpc2EnvelopeHandler, Deferred, DojoPromise){
	if(!samsarasoftware.ws)
		samsarasoftware.ws={};
	samsarasoftware.ws.transportRegistry = new dojo.AdapterRegistry(true);
	samsarasoftware.ws.envelopeRegistry = new dojo.AdapterRegistry(true);
	samsarasoftware.ws.deserializerRegistry = new dojo.AdapterRegistry(true);
	if(!samsarasoftware.jsonrpc)
		samsarasoftware.jsonrpc={};
	samsarasoftware.jsonrpc.envelopeRegistry = new dojo.AdapterRegistry(true);
	samsarasoftware.jsonrpc.transportRegistry = new dojo.AdapterRegistry(true);
	if(!samsarasoftware.jsonrpc.deserializerRegistry)
		samsarasoftware.jsonrpc.deserializerRegistry = new dojo.AdapterRegistry(true);
	
	handlers.register("ws",function(response){return response});
	
	samsarasoftware.ws.envelopeRegistry.register(
		"http://www.w3.org/ns/wsdl/style/iri",
		function(str){ return str == "http://www.w3.org/ns/wsdl/style/iri"; },
		{
			self:this,
			serialize:function( endpoint,method, data ){
				var urlData = requestToUrlData(data, method);
				if(!urlData.headers) urlData.headers= {};
				if(method["whttp:inputSerialization"]!="application/x-www-form-urlencoded")
					urlData.headers["Content-type"]=method["whttp:inputSerialization"];
				urlData.headers["Accept"]=method["whttp:outputSerialization"]+"";
				
				return {
					url: (endpoint._options.address || endpoint.address)+urlData.url
					,data: urlData.data
					,headers:  urlData.headers
					,handleAs: "ws"
				};
			},
			defaultDeserialize(response,method, endpoint){
				var responseContentType=response.getHeader("content-type") ||response.getHeader("Content-Type") ||response.options.headers["Content-type"] ||response.options.headers["content-type"]  ;
				var simplifiedContentType=(responseContentType.indexOf(";")==-1)?responseContentType.trim():responseContentType.substring(0,responseContentType.indexOf(";")).trim();
				
				if(endpoint._options.deserializerRegistry){
					var mixin1={data:endpoint._options.deserializerRegistry.match(simplifiedContentType).deserialize(responseContentType, response.text)};
					return dojo.mixin(dojo.mixin({},response),mixin1)
				}else{
					if(response.status>=200 && response.status<300){
						var mixin1={data:samsarasoftware.ws.deserializerRegistry.match(simplifiedContentType).deserialize(responseContentType, response.text)};
						return dojo.mixin(dojo.mixin({},response),mixin1);

					}else{
						var err=new Error(response.message);
						var httpResponse=samsarasoftware.ws.deserializerRegistry.match(simplifiedContentType).deserialize(responseContentType, response.text);
						err._httpResponseObject=httpResponse;
						err._httpResponse=response;
						throw err;
					}
				}
			},
			handleLogin(response,method, endpoint){
				var lhClass=dojo.config["loginHandler"];
						
				var lh=require(lhClass);
				if(lh instanceof Function){
					lh=new lh(response);
				}
				obj=lh.show(response.text);
				if(obj instanceof Promise || obj instanceof DojoPromise){
					var d=new Deferred();
					obj.then(function a(data){
						try{
							var r=this.defaultDeserialize(data);
							if(r instanceof Error){
								lh.hide();
								d.reject(r);	
							}
							else if(r instanceof Promise || r instanceof Deferred || obj instanceof DojoPromise){
								r.then(function(data2){
									lh.hide();
									d.resolve(data2);
								},function(data2){
									lh.hide();
									d.reject(data2);
								});
							}else{
								lh.hide();
								d.resolve(r);
							} 
						}catch(err){
							lh.hide();
							d.reject(err);
						}
					},function(err){
						d.reject(err);
					});
					
					return d;
				}else{
					return obj;
				} 
			},
			deserialize:function(res){
				var response=res[2];
				var method=res[0];
				var endpoint=res[1];

				
				if(response.status==403){
					return this.handleLogin(response,method, endpoint);
				}else{
					return this.defaultDeserialize(response,method, endpoint);
				}
			},
			
			namedParams: true
		}
	);

	
	function  requestToUrlData(inMap,method){
		//https://www.w3.org/TR/2006/CR-wsdl20-adjuncts-20060327/#in-out
		//6.7.2 Serialization as "application/x-www-form-urlencoded"
		
		if(method.style=="http://www.w3.org/ns/wsdl/style/iri"){
				var location=method["whttp:location"];
				var notFound={};
				var map=new Array();
				
				if(!Array.isArray(inMap)){
					map.push(inMap);
				}else{
					map=inMap;
				}
				for(var i=0;i<map.length;i++){
					for(arg in map[i]){
						var map2=new Array();
					
						if(!Array.isArray(map[i][arg])){
							map2.push(map[i][arg]);
						}else{
							map2=map[i][arg];
						}
						
						//FIXME if its ana array, not sure if its correct
						if(location.indexOf("{"+arg+"}")==-1 && method["whttp:ignoreUncited"]=="false"){
							if(!notFound[arg]) 
								notFound[arg]=new Array();
							notFound[arg]=notFound[arg].concat(map2);
						}else{
							var val="";
							for(var j=0;j<map.length;j++){
								if(map[j][arg]){
									if(i>0){
										val+="&"+arg+"=";
									}
									val+=encodeURIComponent(map[j][arg]);
								}
							}
							location=location.replace("{"+arg+"}",val);
						}
					}
				}
				var data=null;
				
				//with not found params:
				//If the HTTP method used for the request does not allow a message body, then this query string is serialized as parameters in the request IRI (see 6.7.2.2.3 Serialization in the request IRI), otherwise it is serialized in the message body (see 6.7.2.2.4 Serialization in the message body).
				//Si el m?todo no admite body : GET, DELETE,...  se deben poner al final del la location con un ? en caso que no exista, y conversi?n ?param.name=param.value[separator]blabla
				//si el m?todo admite body, POST, PUT...  se crea una cadena de tipo "param.name=param.value[separator]blabla" y se mete en el body 
				if(method["whttp:ignoreUncited"]=="false"){
					if(method["whttp:method"]=="GET" || method["whttp:method"]=="DELETE" ){
						if(location.indexOf("?")==-1) 
							location+="?";
						location+=objectToQuery(notFound,method);
					}else{
						if(method["whttp:inputSerialization"]=="application/x-www-form-urlencoded")
							data=objectToQuery(notFound,method);
						else if(method["whttp:inputSerialization"]=="application/json")
							data = JSON.stringify(inMap);
							
					}
				}
				
				return 	{
							url : location
							,data : data
						}
					
		}
	}

	function objectToQuery(map, method){
			
		var  pairs = [];
		for(var name in map){
			var value = map[name];
			
				
				var assign = name + "=";
				if(value instanceof Array){
					for(var i = 0, l = value.length; i < l; ++i){
						if(value[i])
							pairs.push(assign + encodeURIComponent(value[i]).replace(/%20/g,"+"));
						
					}
				}else{
					
					if(value)
						pairs.push(assign + encodeURIComponent(value).replace(/%20/g,"+"));
				}
			
		}
		var separator=(method["whttp:queryParameterSeparator"])?method["whttp:queryParameterSeparator"]:"&";
		return pairs.join(separator); // String
	}

	
	// see https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html about HTTP methods
	//post is registered first because it is the default;
	samsarasoftware.ws.transportRegistry.register(
		"POST",
		function(str){ return str == "POST"; },
		{
			fire:function(r){
				r.method="POST";
				return xhr(r.url, r);
			}
		}
	);

	samsarasoftware.ws.transportRegistry.register(
		"GET",
		function(str){ return str == "GET"; },
		{
			fire: function(r){
				r.method="GET";
				return xhr(r.url,r);
			}
		}
	);
	samsarasoftware.ws.transportRegistry.register(
		"PUT",
		function(str){ return str == "PUT"; },
		{
			fire:function(r){
				r.method="PUT";
				return xhr(r.url, r);
			}
		}
	);

	samsarasoftware.ws.transportRegistry.register(
		"DELETE",
		function(str){ return str == "DELETE"; },
		{
			fire: function(r){
				r.method="DELETE";
				return xhr(r.url,r);
			}
		}
	);	
	samsarasoftware.ws.transportRegistry.register(
		"HEAD",
		function(str){ return str == "HEAD"; },
		{
			fire: function(r){
				r.method="HEAD";
				return xhr(r.url,r);
			}
		}
	);
	samsarasoftware.ws.transportRegistry.register(
		"OPTIONS",
		function(str){ return str == "OPTIONS"; },
		{
			fire: function(r){
				r.method="OPTIONS";
				return xhr(r.url,r);
			}
		}
	);
	samsarasoftware.ws.transportRegistry.register(
		"TRACE",
		function(str){ return str == "TRACE"; },
		{
			fire: function(r){
				r.method="TRACE";
				return xhr(r.url,r);
			}
		}
	);	
	
	samsarasoftware.ws.deserializerRegistry.register(
		"application/json",
		function(str){ return str == "application/json"; },
		{
			deserialize: function(contentType,data){
				try{
					return JSON.parse(data);
				}catch(e){
					return e;
				}
			}
		}
	);
	
	samsarasoftware.ws.deserializerRegistry.register(
		"application/xml",
		function(str){ return str == "application/xml"; },
		{
			deserialize: function(contentType,data){
				try{
					return handlers.handleXML(data);
				}catch(e){
					return e;
				}
			}
		}
	);

	//Gestionamos respuestas que no sean JSON ni XML
	samsarasoftware.ws.deserializerRegistry.register(
		"text/html",
		function(str){ return str == "text/html"; },
		{
			deserialize: function(contentType,data){
				var err=new Error("Unexpected error");
				err._httpResponseObject={text:data};
				throw err;
			}
		}
	);
	
	samsarasoftware.jsonrpc.transportRegistry.register(
		"POST",
		function(str){ return str == "POST"; },
		{
			fire:function(r){
				r.url = r.target;
				r.method="POST";
				r.postData = r.data;
				r.handleAs= "ws";
				return xhr(r.url,r);
			}
		}
	);

	samsarasoftware.jsonrpc.transportRegistry.register(
		"GET",
		function(str){ return str == "GET"; },
		{
			fire: function(r){
				r.method="GET";
				r.url=  r.target + (r.data ? '?' + ((r.rpcObjectParamName) ? r.rpcObjectParamName + '=' : '') + r.data : '');
				return xhr(r.url,r);
			}
		}
	);

	samsarasoftware.jsonrpc.envelopeRegistry.register(
		"JSON-RPC-2.0",
		function(str){ return str == "JSON-RPC-2.0"; },
		new JsonRpc2EnvelopeHandler()
	);
	
});
