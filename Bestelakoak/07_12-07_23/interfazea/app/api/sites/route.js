import Site from "@/models/Site";
import { NextResponse } from "next/server";
import {connectDB} from "@/utils/mongoose";

export async function GET() {
    console.log('GET');
    console.log('GET');
    connectDB();
    const sites = await Site.find();
    //console.log(params);
    return NextResponse.json(sites);
}

export async function POST(request){

    try {
        connectDB();
        const data = await request.json();
        //console.log(data);
        const newSite = new Site(data)
        //console.log(newTask);
        const savedSite = await newSite.save();
        //console.log(savedTask);
        return NextResponse.json(savedSite);
    } catch (error) {
        return NextResponse.json({
            message: error.message
        },{status: 400});
    }
};