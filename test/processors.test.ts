
import * as assert from 'assert';
import { instance, mock, verify, anyString, when } from 'ts-mockito';
import { ReportEventProcessor, DebuggerAttachedEventProcessor } from '../src/execution/lineProcessors';
import { GaugeWorkspace } from '../src/gaugeWorkspace';
import { GaugeExecutor } from '../src/execution/gaugeExecutor';
import { GaugeDebugger } from '../src/execution/debug';

suite('ReportEventProcessor', () => {
    suite('.process', () => {
        test('should process a given line text and set report path', () => {
            let workspace: GaugeWorkspace = mock(GaugeWorkspace);
            let processor = new ReportEventProcessor(instance(workspace));
            let lineText = "Successfully generated html-report to => path";
            assert.ok(processor.canProcess(lineText));
            processor.process(lineText);
            verify(workspace.setReportPath("path")).called();
        });

        test('should not process if line text does not contain the prefix', () => {
            let workspace: GaugeWorkspace = mock(GaugeWorkspace);
            let processor = new ReportEventProcessor(instance(workspace));
            let lineText = "some other stdout event";
            processor.process(lineText);
            verify(workspace.setReportPath(anyString())).never();
        });
    });
});

suite.only('DebuggerAttachedEventProcessor', () => {
    suite('.process', () => {
        test('should process a given line text and set the process ID', () => {
            let executor: GaugeExecutor = mock(GaugeExecutor);
            let gaugeDebugger = mock(GaugeDebugger);
            when(gaugeDebugger.startDebugger()).thenReturn(Promise.resolve());
            let processor = new DebuggerAttachedEventProcessor(instance(executor));
            let lineText = "Runner Ready for Debugging at Process ID 23456";
            assert.ok(processor.canProcess(lineText));
            processor.process(lineText, instance(gaugeDebugger));
            verify(gaugeDebugger.addProcessId(23456)).called();
            verify(gaugeDebugger.startDebugger()).called();
        });

        test('should process a given line text and start debugger', () => {
            let executor: GaugeExecutor = mock(GaugeExecutor);
            let gaugeDebugger = mock(GaugeDebugger);
            when(gaugeDebugger.startDebugger()).thenReturn(Promise.resolve());
            let processor = new DebuggerAttachedEventProcessor(instance(executor));
            let lineText = "Runner Ready for Debugging";
            assert.ok(processor.canProcess(lineText));
            processor.process(lineText, instance(gaugeDebugger));
            verify(gaugeDebugger.startDebugger()).called();
        });

        test('should not process if line text does not contain the prefix', () => {
            let executor: GaugeExecutor = mock(GaugeExecutor);
            let gaugeDebugger = mock(GaugeDebugger);
            let processor = new DebuggerAttachedEventProcessor(instance(executor));
            let lineText = "some other event";
            processor.process(lineText, instance(gaugeDebugger));
            verify(gaugeDebugger.startDebugger()).never();
        });
    });
});
