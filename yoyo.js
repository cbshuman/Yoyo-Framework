import requests from "../ServerCommunication/request.js"

const regex = /{{([\s\S]*?)}}/g;
const reg = /{{([\s\S]*?)}}/g;

class yoyo 
  {
    constructor()
      {
        this.dom = {};
        this.components = {};
        this.currentPage = {};
        this.pageData = {};
        this.state = {};
        this.bindings = {};
        this.yoyoRoot = document.getElementById("yoyoContent");
        this.currentPage = "";
        this.RoutingParent = null;
      }

    start (pages, components, state, currentPageIndex = 0)
      {
      console.log("Starting Yoyo");

      for(let i = 0; i < state.length; i++)
        {
        this.UpdateState(state[i].key, state[i].value);
        }

      this.ConfigureComponents(components);
      this.ConfigurePages(pages,currentPageIndex);

      this.BuildApplication();
      this.LoadPageIntoDOM(this.currentPage);
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

    ConfigurePages(pages, currentPageIndex)
      {
      for(let i = 0; i < pages.length; i++)
        {
        const template = document.createElement('template');
        template.innerHTML = pages[i].data;
 
        this.pageData[pages[i].path] = 
          { 
          pageName : pages[i].path, 
          raw : pages[i].data, 
          virtualDom : this.BuildVirtualDom(document.createRange().createContextualFragment(pages[i].data),
          pages[i].path)
          };

        if(i == currentPageIndex)
          {
          this.currentPage = pages[i].path;
          }
        }
      }

    BuildApplication()
      {
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

          this.pageData[this.currentPage].virtualDom.children[0];

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
      let yoyoPage = this.LoadElementIntoDOM(pageToLoad.virtualDom.children[0]);
      this.RoutingParent.replaceChildren(yoyoPage);
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

      if(node.nodeType === 3)
        {
        if(node.nodeValue.includes("{{") && node.nodeValue.includes("}}"))
          {
          let parsingDetails = this.ParseTextBindingJavascript(node.nodeValue, virtualNode);
          virtualNode.binding = 
            {
            binding : this.CreateBinding(parsingDetails.code),
            bindingKeys : parsingDetails.bindings
            }
          }
        virtualNode.displayText = node.nodeValue;
        virtualNode.text = node.nodeValue;
        }
      else if(node.getAttribute)
        {
        let yoyoBinding = node.getAttribute("yo-yoBind");
        let yoyoClick = node.getAttribute("yo-onClick");

        if(yoyoBinding)
          {
          node.removeAttribute("yo-yoBind");

          let parsingDetails = this.ParseBindingJavascript(yoyoBinding);
          virtualNode.binding = 
              {
              binding : this.CreateBinding(parsingDetails.code),
              bindingKeys : parsingDetails.bindings
              };
          }
        if(yoyoClick)
          {
          node.removeAttribute("yo-onClick");
          let parsingDetails = this.ParseBindingJavascript(yoyoClick, false);
          virtualNode.binding = 
              {
              onClickBinding : true,
              binding : this.CreateBinding(parsingDetails.code),
              bindingKeys : parsingDetails.bindings
              };
          }
        }

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
      console.log(input);
      input = input.trim();
      let regexDetails = [...input.matchAll(reg)];
      virtualNode.bindings = [];

      let finalCodeString = input;


      //finalCodeString = parsedData.code;

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

      return { code : parsedData.code, bindings : parsedData.bindings }
      }

    ParseBindingJavascript(javaScript)
      {
      let finalCode = javaScript;
      let localBindingKeys = [];

      for(let key in this.state) 
        {
        if(finalCode.includes(key))
          {
          let replaceText = "this.state." + key + ".value";
          finalCode = finalCode.replaceAll(key,replaceText);
          localBindingKeys.push(key);
          }
        }
      return { code : finalCode, bindings : localBindingKeys };
      }

    CreateBinding(value, requireReturn = true)
      {
      value = value.replaceAll("{{", "");
      value = value.replaceAll("}}", "");

      if(!value.includes("return") && requireReturn)
        {
        value = "return " + value;
        }

      console.log(value);
      return new Function(value).bind(this);
      }

    LoadElementIntoDOM(element)
      {
      let newNode = element.targetNode.cloneNode();
      if(element.binding)
        {
        let newBinding =
          {
          element : newNode,
          vElement : element,
          bindingFunction : element.binding.binding,
          onClickBinding : element.binding.onClickBinding || false 
          }

          this.ApplyBindings(newBinding);
          for(let x = 0; x < element.binding.bindingKeys.length; x++)
            {
            this.bindings[element.binding.bindingKeys[x]].push(newBinding);
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
      if(binding.onClickBinding)
        {
        binding.element.onclick = binding.bindingFunction;
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
        replacedText = this.UpdateText(replacedText, element.bindings[i].replaceText, element.bindings[i].binding());
        
        if(!this.bindings[element.bindings[i].boundValue])
          {
          this.bindings[element.bindings[i].boundValue] = []
          }
        }
      return(replacedText);
      }

    UpdateText(originalText, replaceText, value)
      {
      let index = 0;
      do 
        {
        originalText = originalText.replace(replaceText, value);
        } 
      while((index = originalText.indexOf(replaceText, index + 1)) > -1);

      return(originalText);
      }

    UpdateState(targetState, newValue)
      {
      if(!this.state[targetState])
        {
        this.state[targetState] = 
            {
            value : newValue,
            }
        }
      else if(this.state[targetState].value != newValue)
        {
        this.state[targetState].value = newValue;
        this.UpdateBindings(targetState);
        }
      }

    GetStateValue(stateName)
      {
      let returnValue = this.state[stateName] ? this.state[stateName].value : null
      returnValue = Array.isArray(returnValue) ? [...returnValue] : returnValue;
      return returnValue;
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
