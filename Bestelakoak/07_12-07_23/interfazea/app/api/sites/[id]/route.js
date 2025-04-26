import { NextResponse } from "next/server";
import {connectDB} from "@/utils/mongoose";
import Site from "@/models/Site";

export async function GET(request, { params }) {

   try{
    connectDB();
    const siteFound = await Site.findById(params.id);

    if (!siteFound) {
        return NextResponse.json({
            message: `Site not found...${params.id}`,
        }, { status: 404 });
    }

    return NextResponse.json(siteFound);
   }
   catch(error){
       return NextResponse.json({
           message: error.message
       },{status: 400});
   }
}


export async function PUT(request, { params }) {

    try{
        const data = await request.json();
        connectDB();
        const siteUpdated = await Site.findByIdAndUpdate(params.id, data, {
            new: true
        });
        console.log(siteUpdated);
        return NextResponse.json(siteUpdated);
    
    }
    catch(error){
        console.log(error);
        return NextResponse.json({message: error.message},{
            status: 400});
    }
}

export async function DELETE(request, { params }) {
    try{
    const deletedSite = await Site.findByIdAndDelete(params.id);

    if (!deletedSite) {
        return NextResponse.json({
            message: `Tarea no encontrada...${params.id}`,
        }, { status: 404 });
    }

    //console.log(params);
    return NextResponse.json(deletedSite);
    }
    catch(error){
        return NextResponse.json({
            message: error.message
        },{status: 400});
    }
}
