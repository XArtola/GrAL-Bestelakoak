import scrapy
import json

class ExampleSpider(scrapy.Spider):
    name = "example"
    allowed_domains = ["google.com"]
    start_urls = ["https://google.com"]

    def start_requests(self):
        url = 'https://www.google.com/'  # Replace with the target URL
        yield scrapy.Request(url=url, callback=self.parse)

    def parse(self, response):
        enlaces = response.css('a::attr(href)').getall()
        grafo = {}
        for enlace in enlaces:
            url_completa = response.urljoin(enlace)
            grafo[url_completa] = []

        for enlace in enlaces:
            url_completa = response.urljoin(enlace)
            if url_completa not in grafo:
                if url_completa.startswith('http'):  # Follow only external links
                    yield scrapy.Request(url=url_completa, callback=self.parse)
            grafo[response.url].append(url_completa)

        with open('mapa_web.json', 'w') as archivo:
            json.dump(grafo, archivo, indent=4)  # Indent for readability

        # Optional: Limit crawling depth (adjust as needed)
        # if len(grafo) > 100:  # Stop after 100 unique URLs
        #     return