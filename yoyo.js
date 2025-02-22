import requests from "../ServerCommunication/request.js"

const regex = /{{([\s\S]*?)}}/g;

class yoyo 
  {
    constructor(state, actions)
      {
        this.components = {};
        this.currentPage = {};
        this.pageData = [];
        this.state = {};
        this.bindings = {};
        this.yoyoRoot = document.getElementById("yoyoContent");
        this.currentPage = "";
        this.RoutingParent = null;
      
      for(let i = 0; i < state.length; i++)
        {
        this.UpdateState(state[i].key, state[i].value);
        }

      this.actions = {};

      for(let key in actions)
        {
        this.actions[key] = actions[key].bind(this);
        }
      }

    start (pages, components,  currentPage = '')
      {
      console.log("Starting Yoyo");


      this.ConfigureComponents(components);
      this.ConfigurePages(pages);

      this.BuildApplication();

      this.LoadPageIntoDOM(window.location.pathname != "/" ? window.location.pathname : pages[0].path);
      }

    ConfigureComponents(components)
      {
      for(let i = 0; i < components.length; i++)
        {
        this.components[components[i].name] = {}
        }

      for(let i = 0; i < components.length; i++)
        {
        this.components[components[i].name] = 
          {
            raw : components[i].data,
            virtualDom : this.BuildVirtualDom(document.createRange().createContextualFragment(components[i].data),
            components[i].name)
          }
        }
      }

    ConfigurePages(pages)
      {
      for(let i = 0; i < pages.length; i++)
        {
        const template = document.createElement('template');
        template.innerHTML = pages[i].data;

        let setTriggers = {};
        let triggers = pages[i].triggers;
        
        for(let x = 0; x < triggers.length; x++)
          {
          if(!setTriggers[x])
            {
            setTriggers[triggers[x].path] = [];
            }

          let trigger = triggers[x].trigger.bind(this);
          setTriggers[triggers[x].path].push(triggers[x].trigger);
          }

        this.pageData[pages[i].path] = 
          {
          pageName : pages[i].path, 
          triggers : setTriggers,
          raw : pages[i].data, 
          virtualDom : this.BuildVirtualDom(document.createRange().createContextualFragment(pages[i].data),
          pages[i].path)
          };
        }
      }

    BuildApplication()
      {
      window.history.replaceState(this.currentPage, null, "");
      window.onpopstate = (event) => 
        {
        if (event.state) 
          {
          this.LoadPageIntoDOM(event.state);
          }
        };

      for(let key in this.state)
        {
        this.bindings[key] = [];
        }

      this.yoyoRoot.childNodes.forEach(child => 
        {
        if(child.nodeValue != '\n' && this.components[child.nodeName.toLowerCase()])
          {
          let yoyoFragment =
              this.LoadElementIntoDOM(this.components[child.nodeName.toLowerCase()].virtualDom.children[0]);
          this.yoyoRoot.replaceChild(yoyoFragment, child);
          }
        else if(child.nodeName.toLowerCase() == "yoyo")
          {
          this.RoutingParent = document.createElement('div');
          this.RoutingParent.setAttribute("id", "yoyo-routing");

          this.yoyoRoot.replaceChild(this.RoutingParent, child);
          }
        });

      let x = new MutationObserver((e) => 
        {
        if (e[0].removedNodes.length > 0)  
          {
          for(let key in this.bindings)
            {
            for(let i = 0; i < this.bindings[key].length; i++)
              {
              if(this.bindings[key][i].element.isConnected == false)
                {
                this.bindings[key].splice(i,1); 
                }
              }
            }
          };
        });

      x.observe(this.yoyoRoot, { subtree : true, childList: true });
      }

    LoadPageIntoDOM(path)
      {
      let pageToLoad = this.pageData[path];
      if(this.currentPage != path && pageToLoad)
        {
        let yoyoPage = this.LoadElementIntoDOM(pageToLoad.virtualDom.children[0]);
        this.RoutingParent.replaceChildren(yoyoPage);
        
        window.history.pushState(path, null, path);
        this.currentPage = path;
        }
      }
    
    BuildVirtualDom(node, path)
      {
      let virtualNode = 
        {
        type: node.nodeType === 3 ? "TEXT" : node.tagName,
        children : [],
        targetNode : node,
        path : path
        }

      let bindings = [];

      if(node.nodeType === 3)
        {
        if(node.nodeValue.includes("{{") && node.nodeValue.includes("}}"))
          {
          let parsingDetails = this.ParseTextBindingJavascript(node.nodeValue, virtualNode);
          
          bindings.push( 
            {
            binding : this.CreateBinding(parsingDetails.code),
            bindingKeys : parsingDetails.bindings
            });

          }
        virtualNode.displayText = node.nodeValue;
        virtualNode.text = node.nodeValue;
        }
      else if(node.getAttribute)
        {
        let yoyoBinding = node.getAttribute("yo-yoBind");
        let yoyoClick = node.getAttribute("yo-onClick");
        let yoyoChange = node.getAttribute("yo-onChange");
        let yoyoIf = node.getAttribute("yo-if");

        if(yoyoBinding)
          {
          node.removeAttribute("yo-yoBind");

          let parsingDetails = this.ParseBindingJavascript(yoyoBinding);
          bindings.push( 
              {
              binding : this.CreateBinding(parsingDetails.code),
              bindingKeys : parsingDetails.bindings
              });
          }
        if(yoyoClick)
          {
          node.removeAttribute("yo-onClick");
          let parsingDetails = this.ParseBindingJavascript(yoyoClick);
          
          bindings.push( 
              {
              triggerBinding : "click",
              binding : this.CreateBinding(parsingDetails.code,false),
              bindingKeys : parsingDetails.bindings
              });
          }
        if(yoyoChange)
          {
          node.removeAttribute("yo-onChange");
          bindings.push( 
              {
              triggerBinding : "change",
              binding : (x) => { this.UpdateState(yoyoChange, x.target.value) },
              bindingKeys : [ yoyoChange.split('.')[0] ],
              bindingPath : yoyoChange
              });
          }
        if(yoyoIf)
          {
          node.removeAttribute("yo-if");
          let parsingDetails = this.ParseBindingJavascript(yoyoIf, false);
          
          bindings.push( 
              {
              triggerBinding : "if",
              binding : this.CreateBinding(parsingDetails.code),
              bindingKeys : parsingDetails.bindings
              });
          }
        }

      virtualNode.bindings = bindings.length > 0 ? bindings : null;

      node.childNodes.forEach(child => 
        {
        if(child.nodeValue != '\n')
          {
          virtualNode.children.push(this.BuildVirtualDom(child, path));
          }
        });

      return(virtualNode);
      }

    ParseTextBindingJavascript(input, virtualNode)
      {
      input = input.trim();
      let regexDetails = [...input.matchAll(regex)];
      virtualNode.bindings = [];

      let finalCodeString = input;
      let codeStart = input.indexOf("{{");
      let codeEnd = input.lastIndexOf("}}");
     
      if(codeEnd == input.length-2)
        {
        finalCodeString = input.slice(0, codeEnd) + ")";
        }
      else
        {
        finalCodeString += "\""
        }

      if(codeStart == 0)
        {
        finalCodeString = finalCodeString.replace("{{", "String(");
        }
      else
        {
        finalCodeString = "\"" + finalCodeString;
        }

      finalCodeString = finalCodeString.replaceAll("{{", "\" + String(");
      finalCodeString = finalCodeString.replaceAll("}}{{", ") + String(");
      finalCodeString = finalCodeString.replaceAll("}} {{", ") + \" \" + String(");
      finalCodeString = finalCodeString.replaceAll("}}", ") + \"");

      let parsedData = this.ParseBindingJavascript(finalCodeString);

      return { code : this.ParseBindingJavascript(finalCodeString).code, bindings : parsedData.bindings }
      }

    ParseBindingJavascript(javaScript)
      {
      let finalCode = javaScript;
      let localBindingKeys = [];

      if(finalCode[0] == '@')
        {
        return { code : finalCode.replace('@', ''), bindings : localBindingKeys };
        }

      for (let key of Object.keys(this.state).sort((a, b) => b.length - a.length))
        {
        let regex = new RegExp(`\\b${key}\\b`, "g");

        if (finalCode.match(regex)) 
          {
          let replaceText = "this.state." + key;
          finalCode = finalCode.replace(regex, replaceText);

          let bindingKey = key.includes('.') ? key.split('.')[0] : key;
          localBindingKeys.push(bindingKey);
          }
        }
      return { code : finalCode, bindings : localBindingKeys };
      }

    CreateBinding(value, requireReturn = true)
      {
      value = value.replaceAll("{{", "");
      value = value.replaceAll("}}", "");

      if(this.actions[value])
        {
        return this.actions[value];
        }

      if(!value.includes("return") && requireReturn)
        {
        value = "return " + value;
        }

      return new Function(value).bind(this);
      }

    LoadElementIntoDOM(element)
      {
      let newNode = element.targetNode.cloneNode();
      if(element.bindings)
        {
        for(let i = 0; i < element.bindings.length; i++)
          {
          let binding = element.bindings[i];
          let newBinding =
            {
            element : newNode,
            vElement : element,
            bindingFunction : binding.binding,
            triggerBinding : binding.triggerBinding || false,
            bindingPath : binding.bindingPath
            }

          this.ApplyBindings(newBinding);
          for(let x = 0; x < binding.bindingKeys.length; x++)
            {
            this.bindings[binding.bindingKeys[x]].push(newBinding);
            }
          }
        }
      
      if(element.children.length != 0)
        {
        for(let i = 0; i < element.children.length; i++)
          {
          let child = this.LoadElementIntoDOM(element.children[i]);
          newNode.appendChild(child);
          }
        }

      return(newNode);
      }

    ApplyBindings(binding)
      {
      if(binding.triggerBinding)
        {
        switch(binding.triggerBinding)
          {
          case "click":
            binding.element.onclick = binding.bindingFunction;
            break;
          case "change":
            binding.element.value = String(this.GetStateValue(binding.bindingPath));
            binding.element.onchange = binding.bindingFunction;
            break;
          case "if":
            binding.element.style.display = binding.bindingFunction() ? "block" : "none";
          }
        return;
        }

      let bindingResult = binding.bindingFunction();
      if(binding.vElement.type == "TEXT")
        {
        binding.element.nodeValue = bindingResult;
        }
      else
        {
        binding.element.innerHTML = bindingResult;
        }
      }

    ReadTextElementBindings(element, node)
      {
      let replacedText = element.text;
      for(let i = 0; i < element.bindings.length; i ++)
        {
        replacedText = replacedText.replaceAll(element.bindings[i].replaceText, element.bindings[i].binding());
        
        if(!this.bindings[element.bindings[i].boundValue])
          {
          this.bindings[element.bindings[i].boundValue] = []
          }
        }
      return(replacedText);
      }

    GetStateValue(stateName)
      {
      let valuePath = stateName.split(".");
      let returnValue = this.state[valuePath[0]];
      for(let i = 1; i < valuePath.length; i++)
        {
        returnValue = returnValue[valuePath[i]];
        }

      returnValue = Array.isArray(returnValue) ? [...returnValue] : returnValue;
      return returnValue;
      }

    UpdateState(targetState, newValue)
      {
      let valuePath = targetState.split(".");
      if(!(typeof(newValue) == 'function') && newValue)
        {
        //newValue = structuredClone(newValue);
        newValue = JSON.parse(JSON.stringify(newValue));
        }

      if(valuePath.length == 1)
        {
        if(!this.state[valuePath[0]])
          {
          this.state[valuePath[0]] = newValue;
          }
        else if(this.state[valuePath[0]] != newValue)
          {
          this.state[valuePath[0]] = newValue;
          }
        }

      if(this.state[valuePath[0]] == undefined)
        {
        this.state[valuePath[0]] = {};
        }
      let updateState = this.state[valuePath[0]];
      let startState = this.state[valuePath[0]];
     
      for(let i = 1; i < valuePath.length; i++)
        {
        if(!updateState[valuePath[i]] == undefined)
          {
          updateState[valuePath[i]] = {};
          }
        if(valuePath.length-1 == i)
          {
          updateState[valuePath[i]] = newValue;
          break;
          }
        updateState = updateState[valuePath[i]];
        }

      this.UpdateBindings(valuePath[0]);
      this.UpdateTriggers(targetState);
      }

    UpdateTriggers(targetState)
      {
      if(!this.pageData[this.currentPage])
        {
        return;
        }

      let triggers = this.pageData[this.currentPage].triggers[targetState];
      if(triggers)
        {
        for(let i = 0; i < triggers.length; i++)
          {
          triggers[i].apply(this);
          }
        }
      }

    UpdateBindings(stateValue) 
      {
      if(this.bindings[stateValue])
        {
        for(let i = 0; i < this.bindings[stateValue].length; i++)
          {
          this.ApplyBindings(this.bindings[stateValue][i])
          }
        }
      }
  };


export default yoyo
