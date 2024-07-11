from urllib.parse import urlparse
from scrapy.spiders import Spider
from scrapy.selector import Selector
from urllib.parse import urlparse  # Import the urlparse function

from scrapy.loader import ItemLoader
from spider.items import LinkItem
from scrapy.http import Request

class MiSpiderSpider(Spider):
    name = "mi_spider"
    allowed_domains = ["localhost:3000"]
    start_urls = ["http://localhost:3000"]


    def parse(self, response):
        # Seleccionar todos los elementos `a`
        links = response.xpath("//a")

        # Extraer la URL de cada enlace
        for link in links:
            item_loader = ItemLoader(item=LinkItem(), selector=link)
            item_loader.add_xpath("url", "@href")

            yield item_loader.load_item()

            # Seguir el enlace si pertenece al mismo dominio
            url = item_loader.get_output_value("url")
            if self.is_same_domain(url, response.url):
                yield Request(url, callback=self.parse)

            yield item_loader.load_item()

    def is_same_domain(self, url, base_url):
        # Parsear la URL
        parsed_url = urlparse(url[0])  # Select the first element of the list

        # Obtener el nombre del dominio
        domain = parsed_url.hostname

        # Parsear la URL base
        parsed_base_url = urlparse(base_url)

        # Obtener el nombre del dominio base
        base_domain = parsed_base_url.hostname

        # Comparar los nombres de dominio
        return domain == base_domain