import { exec } from 'child_process';
import fs from 'fs';

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else if (stderr) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function getInfoFromURL(baseurl, findurl, depth, obj, debug = false) {
    if (depth === 0) {
        return obj;
    } else {        
        depth--;

        const command1 = `links2 -dump -html-numbered-links 1 ${findurl}`;

        try {
            const stdout = await executeCommand(command1);

            if (debug) {
                console.log(`Salida del comando 1: ${stdout}`);
            }

            const stdoutAux = stdout;

            if (stdoutAux.includes('400. Se trata de un error.')) {
                obj[findurl] = {};
                return obj;
            } else {
                const [stdoutPart1, stdoutPart2] = stdoutAux.split('Links:');

                if (debug) {
                    console.log('Parte 2:', stdoutPart2);
                }

                //console.log('Parte 1:', stdoutPart1);

                const infoObj = {
                    stdoutPart2: stdoutPart2.trim().split('\n')
                };

                const parsedInfo = infoObj.stdoutPart2.map((line) => {
                    const [number, text] = line.split('. ');
    
                    if (text.startsWith('http://') || text.startsWith('https://')) {
                        return { number, type: 'link', text, };
                    } else if (text.startsWith('Image')) {
                        const [_, link] = line.split('Image: ');
                        return { number, type: 'Image', link };
                    }
                    else if (text.startsWith('Post form: ')) {
                        const [_, link] = line.split(': ');
                        return { number, type: 'Post form', link };
                    }
                    else if (text.startsWith('Submit form: ')) {
                        const [_, link] = line.split(': ');
                        return { number, type: 'Submit form', link };
                    }
                    else if (text.startsWith('Checkbox, ')) {
                        const [type, name, value] = line.split(',');
                        const [, , name2] = name.split(' ');
                        const [, , value2] = value.split(' ');
                        return { number, type: 'checkbox', name: name2, value: value2 };
                    }
                    else if (text.startsWith('Text field')) {
                        if (text.includes(',')) {
                            const [type, name] = line.split(',');
                            const [, , name2] = name.split(' ');
                            return { number, type: 'Text field', name: name2 };
                        }
                        else {
                            return { number, type: 'Text field' };
                        }
                    }
                    else if (text.startsWith('Password field')) {
                        if (text.includes(',')) {
                            const [type, name] = line.split(',');
                            const [, , name2] = name.split(' ');
                            return { number, type: 'Password field', name: name2 };
                        }
                        else {
                            return { number, type: 'Password field' };
                        }
                    }
                    else if (text.startsWith('mailto:')) {
    
                        const [, mail] = line.split(':');
                        return { number, type: 'mailto', address: mail };
    
                    }
                });
    
                const regex = /\[(\d+)\]/g;
                let match;
                while ((match = regex.exec(stdoutPart1)) !== null) {
                    const number = match[1];
                    const description = stdoutPart1.substring(match.index + match[0].length, stdoutPart1.indexOf('\n', match.index)).trim();
    
                    const objIndex = parsedInfo.findIndex((obj) => obj.number === number);
                    if (objIndex !== -1) {
                        parsedInfo[objIndex].description = description;
                        if (description.includes(`[${Number(number) + 1}]`)) {
                            parsedInfo[objIndex].description = description.split(`[${Number(number) + 1}]`)[0].trim();
                        }
                    }
    
                }    
    
                if (debug) {
                    console.log('Objeto de información:', infoObj);
                    console.log('Objeto de información parseado:', parsedInfo);
                }

                obj[findurl] = parsedInfo;

                const links = obj[findurl].filter(obj => obj.type === 'link');
                const linkTexts = links.map(link => link.text);

                /*

                Kontuz gero localhostekin egiteko moldatu beharko da

                */

                if (typeof obj !== 'undefined' && obj != null) {
                    let obj1;
                    for (let i = 0; i < linkTexts.length; i++) {
                        const linkText = linkTexts[i];
                        if (!obj[linkText]) {
                            const [,urlWithoutwww] = baseurl.split('www.');
                            const urlWithoutwwwhttps = `https://${urlWithoutwww}`;
                            const urlWithoutwwwhttp = `http://${urlWithoutwww}`;
                            const urlWithwwwhttps = `https://www.${urlWithoutwww}`;
                            const urlWithwwwhttp = `http://www.${urlWithoutwww}`;
                            
                            //console.log(linkText);

                            if (linkText.startsWith(urlWithoutwwwhttps) || linkText.startsWith(urlWithoutwwwhttp)
                                || linkText.startsWith(urlWithwwwhttps) || linkText.startsWith(urlWithwwwhttp)
                            ){
                                //console.log('link valido');
                                obj1 = await getInfoFromURL(baseurl,linkText, depth, obj, false);
                                obj = obj1;
                            }
                            else { 

                                //console.log('link no valido');
                                obj1 = {};
                                obj[linkText] = obj1;
                            }
                            
                        }
                    }
                }
                ///console.log(obj);
                return obj;
            }
        } catch (error) {
            console.error(`Error al ejecutar el comando 1: ${error.message} a la url ${findurl}`);
            return obj;
        }
    }
}

const url = 'https://www.txintxarri.eus';
const depth = 5;
const obj = {};

getInfoFromURL(url, url, depth, obj, false)
    .then((result) => {
        //console.log(result);
        fs.writeFileSync("data2.json", JSON.stringify(result));
    })
    .catch((error) => {
        console.error(error);
    });

/*

    url "berdinak" desberdinak bezala hartzen ditu

*/ 