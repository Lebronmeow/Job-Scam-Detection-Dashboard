import asyncio
from scraper import scrape_naukri

async def main():
    try:
        res = await scrape_naukri("Data Analyst")
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
