# Path to bash
#!/bin/bash

# Going to a folder - lynx browser is going to put there the files obtained from crawling a web site with "www" in its name
cd /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/www/

# Running lynx browser to crawl a web site. Since some links may be missed by lynx if the domain name of the web site to be crawled is put with or without "www", bash script runs lynx browser twice, crawling the web site by its name with "www" and crawling the web site by its name without "www". Here it is with "www". Lynx will automatically go through all the pages and the links on them. All cookies are to be accepted. An amount of time lynx is to try to connect following each link may be set in seconds by the "-connect_timeout" option
lynx -crawl -traversal -accept_all_cookies -connect_timeout=30 http://www.compmiscellanea.com/ > /dev/null

# Going to another folder - lynx browser is going to put there the files obtained from crawling the web site without "www" in its name
cd /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/www2/

# Running lynx browser to crawl a web site. Since some links may be missed by lynx if the domain name of the web site to be crawled is put with or without "www", bash script runs lynx browser twice, crawling the web site by its name with "www" and crawling the web site by its name without "www". Here it is without "www". Lynx will automatically go through all the pages and the links on them. All cookies are to be accepted. An amount of time lynx is to try to connect following each link may be set in seconds by the "-connect_timeout" option
lynx -crawl -traversal -accept_all_cookies -connect_timeout=30 http://compmiscellanea.com/ > /dev/null

# Running lynx browser twice, crawling the web site by its name with "www" and crawling the web site by its name without "www", creates two files with the links collected. So here the content of the second file is added to the end of the first one
cat /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/www2/traverse.dat >> /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/www/traverse.dat

# Links gathered by lynx crawling the web site by its name without "www" have no "www." in the URLs, so to make links collection uniform, the rest of links are stripped from "www.". Then sorted alphabetically by sort. Then uniq removes duplicate entries. Then the result is written into a file named "sitemap.xml" created in the process
cat /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/www/traverse.dat | sed -e 's/\<www\>\.//g' | sort | uniq > /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/sitemap/sitemap.xml

# If there are &, ', ", >, < in URLs, they are to be replaced by &amp;, &apos;, &quot;, &gt;, &lt;. Other special and non-ASCII characters are supposed to be made compliant with the current sitemap.xml file standards and common practice by the web site's developers or its CMS. Otherwise lynx is going to attempt to understand the URLs according to its rules and abilities, to try and read them, then write them to traverse.dat. Depending on the environment lynx is run in, sometimes it will be more or less successful, sometimes more or less not. So, "&" is replaced by "&amp;"
sed -i 's/\&/\&amp\;/g' /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/sitemap/sitemap.xml

# "'" is replaced by "&apos;"
sed -i "s/'/\&apos\;/g" /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/sitemap/sitemap.xml

# """ is replaced by "&quot;"
sed -i 's/"/\&quot\;/g' /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/sitemap/sitemap.xml

# ">" is replaced by "&gt;"
sed -i 's/>/\&gt\;/g' /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/sitemap/sitemap.xml

# "<" is replaced by "&lt;"
sed -i 's/</\&lt\;/g' /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/sitemap/sitemap.xml

# "www." is added to all the links
sed -i 's/http:\/\//http:\/\/www\./g' /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/sitemap/sitemap.xml

# "<url><loc>" is added before every line
sed -i -e 's/^/<url><loc>/' /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/sitemap/sitemap.xml

# "</url></loc>" is added after every line
sed -i -e 's/$/<\/loc><\/url>/' /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/sitemap/sitemap.xml

# Opening tags of XML document and a comment are added before the content of the file
sed -i -e '1 i <?xml version="1\.0" encoding="UTF-8"?>\r\r<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9" xmlns:xsi="http:\/\/www\.w3\.org\/2001\/XMLSchema-instance" xsi:schemaLocation="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9 http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9\/sitemap\.xsd">\r\r<!-- created by sitemap.sh from http:\/\/www.compmiscellanea.com\/en\/lynx-browser-creating-sitemap.xml\.htm -->\r\r' /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/sitemap/sitemap.xml

# Closing tag of XML document is added after the content of the file
sed -i -e '$ a \\r</urlset>' /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/sitemap/sitemap.xml

# Unnecessary links with a given string in them are removed
sed -i '/static/d' /mnt/c/Users/xabia/OneDrive/Documentos/4.Maila/TFG/Bestelakoak/06_13-06_28/Lynx/sitemap/sitemap/sitemap.xml

# Reporting the process is completed
echo "...Done"
