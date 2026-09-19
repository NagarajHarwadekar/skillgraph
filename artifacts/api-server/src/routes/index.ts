import { Router, type IRouter } from "express";
import healthRouter from "./health";
import skillgraphRouter from "./skillgraph";

const router: IRouter = Router();

router.use(healthRouter);
router.use(skillgraphRouter);

export default router;
