import Image from "next/image";
import { Interfazea } from "../components/Interfazea";
import  Site from "@/models/Site";
import { connectDB } from "@/utils/mongoose";

import SiteCard from "@/components/SiteCard";


async function loadSites(){
  connectDB();
  const tasks = await Site.find();
  return tasks;
}

export default async function Home() {

  const sites = await loadSites();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      
      {sites.map((site: { _id: any; name: string; description: string; }) => (
        <SiteCard site={{ ...site, name: '', description: '' }} key={site._id}/>
      ))}

    </main>
  );
}


