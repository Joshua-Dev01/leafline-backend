import { Router } from "express";
import { protect } from "../../../MainAuth/middleware/protect";
import catchAsync from "../../../utils/catchAsync";
import { getEventEngagementAnalytics } from "../controller/eventAlytics.controller";


const Analyticsrouter = Router();


Analyticsrouter.get("/event-analytics", catchAsync(protect), catchAsync(getEventEngagementAnalytics));

export default Analyticsrouter;
