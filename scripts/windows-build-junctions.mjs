import fs from "node:fs";
import path from "node:path";
import {syncBuiltinESMExports} from "node:module";
import {fileURLToPath} from "node:url";

// Windows build workaround. Only generated directory links change.
// Windows Next standalone links are absolute; retarget them to the corresponding
// traced copy so OpenNext's supported code patches are used by the bundler.
if(process.platform === "win32") {
  const root=fs.realpathSync(fileURLToPath(new URL("../",import.meta.url)));
  const clean=value=>path.resolve(value).replace(/^\\\\\?\\/,"").toLowerCase();
  const sourceModules=path.join(root,"node_modules");
  const generatedRoot=path.join(root,".open-next");
  const generatedModules=path.join(generatedRoot,"server-functions","default","node_modules");
  const within=(value,parent)=>value===parent || value.startsWith(parent+path.sep);
  const original=fs.symlinkSync;
  let converted=0;
  fs.symlinkSync=function(target,destination,type) {
    if(type===undefined || type==="dir") {
      const destinationPath=path.resolve(destination);
      const resolvedDestination=clean(path.join(fs.realpathSync(path.dirname(destinationPath)),path.basename(destinationPath)));
      const rawTarget=path.resolve(path.dirname(destinationPath),target);
      if(within(resolvedDestination,clean(generatedModules)) && fs.existsSync(rawTarget)) {
        const resolvedSource=fs.realpathSync(rawTarget);
        if(within(clean(resolvedSource),clean(sourceModules)) && fs.statSync(resolvedSource).isDirectory()) {
          const copiedTarget=path.resolve(generatedModules,path.relative(sourceModules,resolvedSource));
          if(!within(clean(copiedTarget),clean(generatedModules))) throw new Error("Generated junction target escapes isolated modules");
          // Some traces list the link before its target's first file.
          fs.mkdirSync(copiedTarget,{recursive:true});
          const resolvedCopy=fs.realpathSync(copiedTarget);
          if(!within(clean(resolvedCopy),clean(generatedModules))) throw new Error("Generated junction target resolves outside isolated modules");
          const result=original.call(fs,resolvedCopy,destinationPath,"junction");
          converted++;
          return result;
        }
      }
    }
    return original.call(fs,target,destination,type);
  };
  syncBuiltinESMExports();
  process.on("exit",()=>{if(converted)console.error(`[Windows build] ${converted} directory links retargeted to generated traced copies.`);});
}

